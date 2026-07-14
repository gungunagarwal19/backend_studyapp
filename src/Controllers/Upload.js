const catchAsyncError = require("../../middleware/catchAsyncError");
const ErrorHandling = require("../../utils/ErrorHandling");
const { getPineconeIndex } = require('../Service/pineconeClient');
const OpenAI = require('openai');

const fs = require('fs');
const path = require('path');
const Job = require('../Model/Job');
const { pdfProcessingQueue } = require('../Service/queue');

const groq = process.env.GROQ_KEY ? new OpenAI({
  apiKey: process.env.GROQ_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
}) : null;


const generateFlashCards = catchAsyncError(async (req, res, next) => {
    if (!req.file) {
        return next(new ErrorHandling(400, "No file uploaded"));
    }
    const { sectionId } = req.body;
    if (!sectionId) {
        return next(new ErrorHandling(400, "sectionId is required"));
    }

    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = req.file.originalname;
    const filePath = path.join(uploadDir, `${Date.now()}-${fileName}`);
    fs.writeFileSync(filePath, req.file.buffer);

    const job = await Job.create({
        status: 'pending',
        sectionId,
        fileName,
        filePath
    });

    await pdfProcessingQueue.add('process-pdf', {
        jobId: job._id.toString()
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    });

    res.status(200).json({
        jobId: job._id,
        status: 'pending'
    });
});

const getJobStatus = catchAsyncError(async (req, res, next) => {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) {
        return next(new ErrorHandling(404, 'Job not found'));
    }
    res.status(200).json({
        status: job.status,
        error: job.error || null,
        result: job.result || null
    });
});

const answerQuestion = catchAsyncError(async (req, res, next) => {
    const { question, topK = 5, sectionId } = req.body;
    if (!question) {
        return next(new ErrorHandling(400, 'Question is required'));
    }
    if (!sectionId) {
        return next(new ErrorHandling(400, 'sectionId is required'));
    }
    const pineconeIndex = getPineconeIndex();
    const namespace = pineconeIndex.namespace(`${sectionId}`)

    const response = await namespace.searchRecords({
        query: {
            inputs: { text: question },
            topK
        },
        fields: ['text'],
    });

    const matches = response.result?.hits || [];
    const context = matches.map(m => m.fields?.text || m.text || "").join("\n\n");

    if (!matches.length || !context.trim() || context.trim().length < 20) {
        return res.status(200).json({
            answer: 'Please ask from uploaded content',
            message: 'Please ask from uploaded content'
        });
    }


    const prompt = `Given the following context, answer the question as accurately as possible.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
    
    if (groq) {
        console.log("Generating Q&A answer using Groq (llama-3.3-70b-versatile)...");
        try {
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: prompt }
                ]
            });
            const answer = completion.choices[0].message.content;
            return res.status(200).json({
                answer,
                message: 'Answer generated using Groq and Pinecone context'
            });
        } catch (groqErr) {
            console.error("Groq Q&A failed:", groqErr);
        }
    }

    console.warn("Groq failed or not configured. Falling back to retrieved document context.");
    return res.status(200).json({
        answer: `Here is the relevant context found in your document:\n\n${context.substring(0, 1000)}${context.length > 1000 ? '...' : ''}`,
        message: 'Answer retrieved directly from document context (AI models offline)'
    });
});

module.exports = { generateFlashCards, answerQuestion, getJobStatus }