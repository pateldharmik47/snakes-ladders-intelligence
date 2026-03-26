/**
 * Executes a resilient fetch request with exponential backoff designed for Vercel/Gemini proxy structures.
 * 
 * @param {string} directUrl - The fallback direct connection URL.
 * @param {object} options - Fetch configuration options (method, headers, body).
 * @param {number} [retries=3] - Maximum number of retry attempts allowed on limits.
 * @param {number} [delay=2000] - Base delay interval in milliseconds for backoff.
 * @returns {Promise<Response>} Resolves with the valid network response.
 * @throws {Error} Throws standard network or routing errors upon true failure.
 */
async function fetchWithRetry(directUrl, options, retries = 3, delay = 2000) {
  let isUsingProxy = true;
  
  for (let i = 0; i < retries; i++) {
    let response;
    try {
      // Safely try proxy routing first for production
      const urlToHit = isUsingProxy ? '/api/gemini' : directUrl;
      response = await fetch(urlToHit, options);
      
      // If we are developing locally without Vercel running (gives 404)
      if (response.status === 404 && isUsingProxy) {
        console.info("[Dev Mode] Local serverless proxy not found. Falling back to direct connection using config.js...");
        isUsingProxy = false;
        response = await fetch(directUrl, options);
      }
    } catch (e) {
      // Local file:// protocol exceptions when hitting /api/gemini
      if (isUsingProxy) {
        console.info("[Dev Mode] Local proxy failed (network). Falling back to direct connection...");
        isUsingProxy = false;
        response = await fetch(directUrl, options);
      } else {
        throw e; // Reraise true failure
      }
    }

    if (!response.ok && response.status === 429 && i < retries - 1) {
      console.warn(`[API] 429 Too Many Requests. Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
      continue;
    }
    return response;
  }
}

/**
 * Automatically requests and parses a uniquely generated cognitive challenge from the primary LLM model.
 *
 * @param {string} challengeType - Specific mathematical, trivia, or algorithmic format.
 * @param {string} difficulty - Pre-configured difficulty scalar ("easy", "medium", "hard").
 * @returns {Promise<Object>} An embedded structured object encapsulating the challenge data.
 */
async function generateChallenge(challengeType, difficulty) {


  const prompt = `You are a game show host for an intelligent board game. 
Generate a ${challengeType} challenge at ${difficulty} difficulty for a player.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "type": "${challengeType}",
  "difficulty": "${difficulty}",
  "question": "The challenge question here",
  "hint": "A subtle hint (max 8 words)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sample_good_answer": "A full correct answer example",
  "scoring_guide": "What makes a 1-point answer vs a 6-point answer"
}

Rules:
- trivia: factual question about science, history, geography, or culture
- math: arithmetic or logic puzzle solvable mentally in 30 seconds  
- riddle: creative riddle with a clear answer
- wordplay: anagram, word association, or fill-in-the-blank

Keep questions concise (max 20 words). Make them fun and engaging.`;

  try {
    const response = await fetchWithRetry(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
      })
    });
    
    if (!response.ok) throw new Error(`API response not ok: ${response.status}`);

    const data = await response.json();
    const textData = data.candidates[0].content.parts[0].text;
    
    const jsonStr = textData.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    return JSON.parse(jsonStr);

  } catch (err) {
    console.error("Gemini API Error (Challenge):", err);
    return {
      type: challengeType,
      difficulty: difficulty, 
      question: "Which planet in our solar system has the most moons?",
      hint: "It has beautiful rings too",
      keywords: ["Saturn", "moons", "82"],
      sample_good_answer: "Saturn, with 82 confirmed moons",
      scoring_guide: "6 for Saturn + count, 4 for Saturn only, 1 for wrong planet"
    };
  }
}

/**
 * Cross-references the player's semantic response firmly against standardized model routing constraints to assign a score.
 *
 * @param {string} question - The original challenge generated query.
 * @param {string} userAnswer - Open-ended responsive text provided dynamically by user.
 * @param {Array<string>} keywords - Validated heuristic logic keywords.
 * @param {string} scoringGuide - Custom scoring weights parameter injected by game.
 * @returns {Promise<Object>} A final score (1-6) along with targeted model feedback.
 */
async function evaluateAnswer(question, userAnswer, keywords, scoringGuide) {


  const prompt = `You are a strict but fair judge in an intelligent board game.

QUESTION: "${question}"
PLAYER'S ANSWER: "${userAnswer}"
KEYWORDS TO LOOK FOR: ${keywords.join(", ")}
SCORING GUIDE: "${scoringGuide}"

Score the player's answer on a scale of 1 to 6 using this rubric:
- 6: Perfect answer — correct, complete, confident
- 5: Very good — correct but missing one minor detail
- 4: Good — mostly right, small gap in knowledge
- 3: Partial — relevant but incomplete or vague
- 2: Weak attempt — touched on the topic but mostly wrong
- 1: Wrong or blank — no meaningful answer given

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "score": 4,
  "feedback": "<one encouraging sentence explaining the score, max 15 words>",
  "correct_answer": "<brief correct answer in max 10 words>"
}`;

  try {
    const response = await fetchWithRetry(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
      })
    });
    
    if (!response.ok) throw new Error(`API response not ok: ${response.status}`);

    const data = await response.json();
    const textData = data.candidates[0].content.parts[0].text;
    
    const jsonStr = textData.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    return JSON.parse(jsonStr);

  } catch (err) {
    console.error("Gemini API Error (Evaluation):", err);
    const score = Math.floor(Math.random() * 5) + 2; // Random 2-6
    return { score: score, feedback: "Great attempt! Here is some fallback generic feedback due to connection issue.", correct_answer: "Mock fallback data." };
  }
}

window.gemini = {
    generateChallenge,
    evaluateAnswer
};
