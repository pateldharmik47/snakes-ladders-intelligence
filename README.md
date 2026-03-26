# Snakes & Ladders: Intelligence Edition

## Chosen Vertical
Education & Skill Assessment — an intelligent game that replaces pure luck with cognitive challenge.

## Approach and Logic
Instead of rolling a random dice, players answer an AI-generated challenge (trivia, riddle, math, or wordplay) and the quality of their answer determines how far they move (1 to 6 steps). No randomness — pure intelligence.

## How the Solution Works
1. Player initiates a turn
2. Gemini API generates a context-appropriate challenge (trivia/math/riddle/wordplay)
3. Player answers within 30 seconds
4. Gemini evaluates the answer and returns a score 1–6 with feedback
5. Player moves that many squares; snakes and ladders apply normally
6. Difficulty auto-adjusts based on performance history

## Google Services Used
- **Gemini API (gemini-2.0-flash)**: Challenge generation + answer evaluation
- Model: `gemini-2.0-flash` via REST API

## Setup Instructions
1. Clone the repository
2. Open `config.js` and paste your Gemini API key. (If you use `YOUR_GEMINI_API_KEY_HERE`, it will run in Demo Mode).
3. Open `index.html` in a browser (no build step needed)

## Assumptions Made
- Single player vs board (no multiplayer)
- API key is provided by the user (not bundled)
- Modern browser required for CSS animations

## Security Notes
- API key stored in config.js (client-side); for production, proxy through a backend
- No user data is stored or transmitted beyond Gemini API calls
