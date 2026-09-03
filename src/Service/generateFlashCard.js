const OpenAI = require('openai');

const groq = process.env.GROQ_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    })
  : null;

let groqExhausted = false;
let groqExhaustedTime = null;

function extractAndParseJSON(text) {
  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  // Remove markdown code fences if the model adds them
  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // First attempt: parse the complete response
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Initial JSON parse failed:", e.message);
  }

  // Try to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonObject = cleaned.substring(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(jsonObject);
    } catch (e) {
      console.error("Object JSON parse failed:", e.message);
    }
  }

  // Try to extract JSON array
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const jsonArray = cleaned.substring(firstBracket, lastBracket + 1);

    try {
      return JSON.parse(jsonArray);
    } catch (e) {
      console.error("Array JSON parse failed:", e.message);
    }
  }

  // Show a small portion of the problematic response
  console.error(
    "Invalid Groq response:",
    cleaned.substring(0, 2000)
  );

  throw new Error(
    "Groq returned invalid JSON. Unable to parse AI response."
  );
}

function getFlashcardsArray(parsed) {
  if (!parsed) return null;

  // Case 1:
  // [
  //   {...},
  //   {...}
  // ]
  if (Array.isArray(parsed)) {
    return parsed;
  }

  // Case 2:
  // {
  //   flashcards: [...]
  // }
  if (
    parsed.flashcards &&
    Array.isArray(parsed.flashcards)
  ) {
    return parsed.flashcards;
  }

  // Case 3: find any array containing objects with question
  for (const value of Object.values(parsed)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      value[0].question
    ) {
      return value;
    }
  }

  return null;
}

async function generateContentWithGroq(rawText) {
  if (!groq) {
    throw new Error(
      "Groq is not initialized (missing GROQ_KEY)"
    );
  }

  const groqInstructions = `
You are an expert educational assistant.

Your task is to generate flashcards from the provided educational text.

IMPORTANT:
Return ONLY a valid JSON object.

The JSON MUST have exactly this structure:

{
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "explanation": "string"
    }
  ]
}

Rules:

1. Return ONLY JSON.
2. Do NOT use markdown.
3. Do NOT use triple backticks.
4. Do NOT add text before or after the JSON.
5. Every object in the flashcards array MUST contain:
   - question
   - answer
   - explanation
6. Use double quotes around all JSON keys and string values.
7. Escape double quotes inside string values properly.
8. Do not add trailing commas.
9. Generate maximum 30 flashcards.
10. All questions and answers must be based only on the provided text.
`;

  const prompt = `
Generate useful question-answer flashcards from this text.

TEXT:
${rawText}
`;

  console.log(
    "Generating content using Groq (openai/gpt-oss-20b)..."
  );

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",

    messages: [
      {
        role: "system",
        content: groqInstructions
      },
      {
        role: "user",
        content: prompt
      }
    ],

    temperature: 0.2,

    response_format: {
      type: "json_object"
    }
  });

  const responseText =
    completion.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error(
      "Groq returned an empty response"
    );
  }

  console.log(
    "Groq response received successfully."
  );

  const parsed = extractAndParseJSON(responseText);

  const flashcards = getFlashcardsArray(parsed);

  if (
    !Array.isArray(flashcards) ||
    flashcards.length === 0
  ) {
    throw new Error(
      "Groq response does not contain valid flashcards."
    );
  }

  // Validate every flashcard
  const validFlashcards = flashcards.filter(
    (card) =>
      card &&
      typeof card === 'object' &&
      typeof card.question === 'string' &&
      typeof card.answer === 'string' &&
      typeof card.explanation === 'string'
  );

  if (validFlashcards.length === 0) {
    throw new Error(
      "No valid flashcards found in Groq response."
    );
  }

  return validFlashcards;
}

async function generateContent(rawText) {
  const now = Date.now();

  // Clear Groq exhaustion after 12 hours
  if (
    groqExhausted &&
    groqExhaustedTime &&
    now - groqExhaustedTime >
      12 * 60 * 60 * 1000
  ) {
    groqExhausted = false;
    groqExhaustedTime = null;

    console.log(
      "Exhaustion period for Groq expired. Re-enabling."
    );
  }

  if (
    process.env.GROQ_KEY &&
    !groqExhausted
  ) {
    try {
      const content =
        await generateContentWithGroq(rawText);

      if (
        Array.isArray(content) &&
        content.length > 0
      ) {
        return content;
      }
    } catch (groqErr) {
      console.error(
        "Groq generation failed:",
        groqErr
      );

      const isQuota =
        groqErr.status === 429 ||
        (groqErr.message &&
          groqErr.message.includes('429')) ||
        (groqErr.message &&
          groqErr.message
            .toLowerCase()
            .includes('quota')) ||
        groqErr.code === 'insufficient_quota';

      if (isQuota) {
        console.warn(
          "Groq quota/rate limit reached. Disabling for 12 hours."
        );

        groqExhausted = true;
        groqExhaustedTime = Date.now();
      }

      throw groqErr;
    }
  }

  throw new Error(
    "Groq key is missing or service is exhausted."
  );
}

module.exports = {
  generateContent
};