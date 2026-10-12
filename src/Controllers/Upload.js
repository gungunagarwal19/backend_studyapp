const catchAsyncError = require("../../middleware/catchAsyncError");
const ErrorHandling = require("../../utils/ErrorHandling");
const { getPineconeIndex } = require('../Service/pineconeClient');
const OpenAI = require('openai');

const fs = require('fs');
const path = require('path');
const Job = require('../Model/Job');
const Section = require('../Model/Section');
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
    const section = await Section.findOne({
    _id: sectionId,
    userId: req.user._id
});

if (!section) {
    return next(
        new ErrorHandling(
            404,
            'Section not found or not authorized'
        )
    );
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
    console.log(
    "Section:",
    section.title,
    "sectionId:",
    sectionId
   );
   console.log(
    "Pinecone matches:",
    matches.map(m => ({
        score: m._score,
        text: (m.fields?.text || "").substring(0, 100)
    }))
   );
    const context = matches.map(m => m.fields?.text || m.text || "").join("\n\n");

    if (!matches.length || !context.trim() || context.trim().length < 20) {
        return res.status(200).json({
            answer: 'Please ask from uploaded content',
            message: 'Please ask from uploaded content'
        });
    }


const prompt = `
You are Learnmate, an educational AI assistant for students.

The user is currently asking a question from this section:
Section: ${section.title}

CONTENT RESTRICTIONS:
1. Answer ONLY using the information provided in the context below.
2. The context belongs ONLY to the current section: "${section.title}".
3. DO NOT use knowledge from any other section, subject, previous conversation, or outside source.
4. If the answer cannot be found or reasonably inferred from the provided context, DO NOT guess.
5. If the information is not available in the current section, respond exactly:
"I couldn't find this information in the current section."
6. Do not create facts that are not supported by the context.

FORMATTING & TEACHING GUIDELINES (Always output standard clean Markdown):
1. Direct Start: Begin directly with a short, clear explanation. Avoid unnecessary meta-introductions (like "Sure, here is...") and repetitive conclusions.
2. Meaningful Headings: Use clear markdown headings (### or ####) for different concepts or key themes. Avoid excessive headings.
3. Student-Friendly: Explain concepts in simple, intuitive, student-friendly language.
4. Steps & Bullet Points: Use numbered lists (1., 2., 3.) for processes, workflows, and procedures. Use bullet points (- ) for key takeaways and features. Always leave blank lines between items so they format properly.
5. Tables: Use standard Markdown tables (| Column 1 | Column 2 |) only when comparing multiple concepts or tabular data.
6. Code & Calculations: Use fenced code blocks with syntax language tags (\`\`\`language ... \`\`\`) for code snippets and commands. Use clear formatting or inline code for mathematical formulas and calculations.
7. Highlight Key Points: Highlight important definitions, key terms, and exam-relevant takeaways using **bold** or blockquotes (> ).
8. Clean Paragraphs: Avoid dense walls of text; keep paragraphs focused and short (2-4 sentences). Ensure proper blank lines between markdown elements.
9. Adapt Length: Adapt the answer length to the question instead of making every response unnecessarily long.

CURRENT SECTION CONTENT:
${context}

USER QUESTION:
${question}

ANSWER:
`;
    
    if (groq) {
        console.log("Generating Q&A answer using Groq (openai/gpt-oss-120b)...");
        try {
            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-120b",
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