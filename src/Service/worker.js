const { Worker } = require('bullmq');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Job = require('../Model/Job');
const FlashCard = require('../Model/FlashCard');
const Section = require('../Model/Section');
const { generateContent } = require('./generateFlashCard');
const { getPineconeIndex } = require('./pineconeClient');
const { redisConnection, pdfProcessingQueue } = require('./queue');
const { v4: uuidv4 } = require('uuid');

const worker = new Worker('pdf-processing', async (job) => {
    const { jobId } = job.data;
    const dbJob = await Job.findById(jobId);
    if (!dbJob) {
        throw new Error(`Job ${jobId} not found in database`);
    }

    dbJob.status = 'processing';
    await dbJob.save();

    try {
        const fileBuffer = fs.readFileSync(dbJob.filePath);
        const parsed = await pdfParse(fileBuffer);
        const rawText = parsed.text;

        const maxChunkLength = 10000;
        const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);
        let batchChunks = [];
        let batchChunk = '';
        for (const para of paragraphs) {
            if ((batchChunk + '\n' + para).length > maxChunkLength) {
                batchChunks.push(batchChunk);
                batchChunk = para;
            } else {
                batchChunk += (batchChunk ? '\n' : '') + para;
            }
        }
        if (batchChunk.trim()) batchChunks.push(batchChunk);

        let qaPairs = [];
        for (let i = 0; i < batchChunks.length; i++) {
            if (i > 0) {
                // Sleep for 6 seconds between chunks to respect Groq API rate limits
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
            const chunk = batchChunks[i];
            try {
                const pairs = await generateContent(chunk);
                if (Array.isArray(pairs)) {
                    qaPairs = qaPairs.concat(pairs);
                }
            } catch (chunkErr) {
                console.error(`Error generating content for chunk ${i + 1}/${batchChunks.length}:`, chunkErr);
                throw chunkErr;
            }
        }

        let validPairs = qaPairs.filter(qa => qa && typeof qa.question === 'string' && qa.question.trim() && typeof qa.answer === 'string' && qa.answer.trim());

        if (!validPairs.length) {
            throw new Error('Failed to generate any valid Q&A pairs from AI.');
        }

        const flashcards = await FlashCard.insertMany(
            validPairs.map((qa) => ({
                sectionId: dbJob.sectionId,
                question: qa.question,
                answer: qa.answer,
                explanation: qa.explanation || "",
                ease: qa.ease,
                interval: qa.interval,
                lastReviewed: qa.lastReviewed
                    ? new Date(
                        typeof qa.lastReviewed === "string"
                            ? qa.lastReviewed.replace(/\[UTC\]$/, "")
                            : qa.lastReviewed
                    )
                    : undefined
            }))
        );

        if (!flashcards) {
            throw new Error('Failed to save flashcards');
        }

        if (dbJob.sectionId && dbJob.fileName) {
            await Section.findByIdAndUpdate(
                dbJob.sectionId,
                { $addToSet: { files: dbJob.fileName } },
                { new: true }
            );
        }

        const pineconeIndex = getPineconeIndex();
        const chunkSize = 1000;
        let chunks = [];
        let currentChunk = '';
        for (const para of paragraphs) {
            if ((currentChunk + para).length > chunkSize) {
                chunks.push(currentChunk);
                currentChunk = para;
            } else {
                currentChunk += ' ' + para;
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        const uploadId = uuidv4();
        const records = chunks.map((chunk, i) => ({
            "_id": `${dbJob.sectionId}-upload-${uploadId}-chunk-${i}`,
            "text": chunk
        }));

        const namespace = pineconeIndex.namespace(`${dbJob.sectionId}`);
        const BATCH_SIZE = 95;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await namespace.upsertRecords(batch);
        }

        // Cleanup temporary PDF file
        if (fs.existsSync(dbJob.filePath)) {
            fs.unlinkSync(dbJob.filePath);
        }

        dbJob.status = 'completed';
        dbJob.result = {
            flashcardsCount: flashcards.length,
            pineconeUpsertedCount: records.length
        };
        await dbJob.save();

    } catch (err) {
        console.error(`Error in worker processing job ${jobId}:`, err);
        
        const is404 = err.status === 404 || (err.message && err.message.includes('404'));
        const isDailyLimit = err.message && (
          err.message.includes('limit: 0') || 
          err.message.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier') ||
          err.message.includes('insufficient_quota') ||
          err.code === 'insufficient_quota'
        );
        const isRateLimit = err.status === 429 || 
                            (err.message && err.message.includes('429')) || 
                            (err.message && err.message.toLowerCase().includes('quota exceeded'));

        // If it's a rate limit or daily limit, auto-postpone the job rather than throwing/failing permanently
        if (isDailyLimit || isRateLimit) {
            const delayTime = isDailyLimit ? 3600000 : 300000; // 1 hour for daily quota, 5 mins for transient limit
            const delayStr = isDailyLimit ? "1 hour" : "5 minutes";
            
            dbJob.status = 'pending';
            dbJob.error = `Quota/Rate limit hit. Job auto-postponed for ${delayStr}. Details: ${err.message || String(err)}`;
            await dbJob.save();

            console.warn(`[Auto-Postpone] Quota/rate limit hit for job ${jobId}. Rescheduling in ${delayStr}.`);

            await pdfProcessingQueue.add('process-pdf', {
                jobId: dbJob._id.toString()
            }, {
                delay: delayTime
            });

            // Return cleanly so that the current job is removed from queue correctly, and the delayed job handles the retry
            return;
        }

        const isLastAttempt = is404 || ((job.attemptsMade + 1) >= (job.opts.attempts || 1));
        
        if (isLastAttempt) {
            dbJob.status = 'failed';
            dbJob.error = err.message || String(err);
            await dbJob.save();
            
            // Clean up file only when we are not retrying anymore
            if (fs.existsSync(dbJob.filePath)) {
                try {
                    fs.unlinkSync(dbJob.filePath);
                } catch (cleanupErr) {
                    console.error('Failed to cleanup file on error:', cleanupErr);
                }
            }
        } else {
            dbJob.error = `Attempt ${job.attemptsMade + 1} failed: ${err.message || String(err)}`;
            await dbJob.save();
        }
        throw err;
    }
}, {
    connection: redisConnection,
    lockDuration: 300000 // 5 minutes lock duration
});

worker.on('failed', (job, err) => {
    console.error(`BullMQ job ${job?.id} failed:`, err);
});

module.exports = worker;
