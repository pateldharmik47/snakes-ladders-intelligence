// config.example.js — Central configuration example.
// Rename to config.js and add your actual API key, or leave as YOUR_GEMINI_API_KEY_HERE for Demo Mode.
window.CONFIG = {
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE",
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  BOARD_SIZE: 100,
  CHALLENGE_TYPES: ["trivia", "math", "riddle", "wordplay"],
  DIFFICULTY_LEVELS: ["easy", "medium", "hard"],
};
