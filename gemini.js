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

async function generateChallenge(challengeType, difficulty) {
  if (CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !CONFIG.GEMINI_API_KEY) {
    console.log("[Demo Mode] Generating mock challenge");
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          type: challengeType,
          difficulty: difficulty,
          question: "Which planet in our solar system has the most moons?",
          hint: "It has beautiful rings too",
          keywords: ["Saturn", "moons", "82", "146"],
          sample_good_answer: "Saturn, with confirmed moons",
          scoring_guide: "6 for Saturn + count, 4 for Saturn only, 1 for wrong planet"
        });
      }, 1000);
    });
  }

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

async function evaluateAnswer(question, userAnswer, keywords, scoringGuide) {
  if (CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !CONFIG.GEMINI_API_KEY) {
     console.log("[Demo Mode] Generating mock evaluation");
     return new Promise(resolve => {
        setTimeout(() => {
          const score = Math.floor(Math.random() * 5) + 2; // Random 2-6
          resolve({
            score: score,
            feedback: "Great attempt! Here is some generic feedback.",
            correct_answer: "The correct answer was mock data."
          });
        }, 1200);
     });
  }

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
    return { score: 3, feedback: "Challenge skipped due to connection issue.", correct_answer: "N/A" };
  }
}

window.gemini = {
    generateChallenge,
    evaluateAnswer
};
