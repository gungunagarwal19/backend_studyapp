const OpenAI = require('openai');

const groq = process.env.GROQ_KEY ? new OpenAI({
  apiKey: process.env.GROQ_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
}) : null;


let groqExhausted = false;
let groqExhaustedTime = null;

function extractAndParseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonContent = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonContent);
      } catch (e2) {
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const arrayContent = text.substring(firstBracket, lastBracket + 1);
          try {
            const arr = JSON.parse(arrayContent);
            return arr;
          } catch (e3) {
            throw new Error("Could not parse extracted JSON content: " + e3.message);
          }
        }
        throw e2;
      }
    }
    throw e;
  }
}

function getFlashcardsArray(parsed) {
  if (!parsed) return null;
  if (Array.isArray(parsed)) return parsed;
  if (parsed.flashcards && Array.isArray(parsed.flashcards)) return parsed.flashcards;
  
  // Find any array property where elements look like flashcards (have a question)
  for (const val of Object.values(parsed)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0].question) {
      return val;
    }
  }
  return null;
}

async function generateContentWithGroq(rawText) {
  if (!groq) {
    throw new Error("Groq is not initialized (missing GROQ_KEY)");
  }

  const groqInstructions = `You are an expert educational assistant that generates spaced-repetition flashcards from the provided text.
You MUST output your response as a valid JSON object. The JSON object must have exactly one root key named "flashcards" containing an array of objects.

JSON Format Template:
{
  "flashcards": [
    {
      "question": "A clear, concise question based on the text.",
      "answer": "The accurate answer based on the text.",
      "explanation": "Detailed explanation of the answer."
    }
  ]
}

Strict Rules:
1. Do NOT include any introductory or concluding text, explanations, or remarks outside the JSON object.
2. Do NOT wrap the JSON output in markdown code blocks or backticks (do not write \`\`\`json).
3. Do NOT echo or copy-paste sections of the input text directly at the root of the JSON. Only output valid JSON matching the format template.`;

  const prompt = `Generate as many question and answer pairs as possible from the following text (maximum 30 pairs). Each set must include "question", "answer", and "explanation".

Text:
${rawText}`;

  console.log("Generating content using Groq (llama-3.3-70b-versatile)...");
  
  // We removed response_format: { type: "json_object" } so that Groq does not throw 400 validation failures.
  // Instead, the response is parsed/extracted directly by our local parser, avoiding validation error logs entirely.
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: groqInstructions },
      { role: "user", content: prompt }
    ]
  });

  const parsed = extractAndParseJSON(completion.choices[0].message.content);
  return getFlashcardsArray(parsed);
}

async function generateContent(rawText) {
  const now = Date.now();

  // Clear Groq exhaustion after 12 hours
  if (groqExhausted && groqExhaustedTime && (now - groqExhaustedTime > 12 * 60 * 60 * 1000)) {
    groqExhausted = false;
    groqExhaustedTime = null;
    console.log("Exhaustion period for Groq expired. Re-enabling for requests.");
  }

  // Use Groq as the primary flow
  if (process.env.GROQ_KEY && !groqExhausted) {
    try {
      const content = await generateContentWithGroq(rawText);
      if (Array.isArray(content) && content.length > 0) {
        return content;
      }
    } catch (groqErr) {
      console.error("Groq generation failed:", groqErr);

      const isQuota = groqErr.status === 429 || 
                      (groqErr.message && groqErr.message.includes('429')) || 
                      (groqErr.message && groqErr.message.toLowerCase().includes('quota')) ||
                      (groqErr.code === 'insufficient_quota') ||
                      (groqErr.message && groqErr.message.includes('insufficient_quota'));
      
      if (isQuota) {
        console.warn(`Groq is exhausted (Quota/Rate Limit). Disabling it for 12 hours. Details: ${groqErr.message || groqErr}`);
        groqExhausted = true;
        groqExhaustedTime = Date.now();
      }
      throw groqErr;
    }
  }

  throw new Error("Groq key is missing or service is exhausted.");
}

module.exports = { generateContent };

