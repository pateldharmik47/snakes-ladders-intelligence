const SNAKES = {
  97: 78, 95: 56, 88: 24, 62: 18, 48: 26, 36: 6, 32: 10
};
const LADDERS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91
};

const state = {
  playerPosition: 1,         
  score: 0,                  
  turn: 0,                   
  currentChallenge: null,    
  isWaiting: false,          
  difficulty: "medium",      
  challengeTypeIdx: 0,       
  history: [],               
  timerInterval: null,
  timeLeft: 30
};

// UI Elements
const els = {
    board: document.getElementById('board'),
    playerToken: document.getElementById('player-token'),
    turnDisp: document.getElementById('turn-display'),
    posDisp: document.getElementById('pos-display'),
    scoreDisp: document.getElementById('score-display'),
    diffBadge: document.getElementById('diff-badge'),
    rollBtn: document.getElementById('roll-btn'),
    loadingState: document.getElementById('loading-state'),
    loadingText: document.getElementById('loading-text'),
    challengeCard: document.getElementById('challenge-card'),
    chTypeBadge: document.getElementById('ch-type-badge'),
    chQuestion: document.getElementById('ch-question'),
    timerBar: document.getElementById('timer-bar'),
    hintBtn: document.getElementById('hint-btn'),
    chHint: document.getElementById('ch-hint'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    resultCard: document.getElementById('result-card'),
    resScore: document.getElementById('res-score'),
    resFeedback: document.getElementById('res-feedback'),
    resCorrect: document.getElementById('res-correct'),
    resMove: document.getElementById('res-move'),
    resEvent: document.getElementById('res-event'),
    nextBtn: document.getElementById('next-btn'),
    historyContainer: document.getElementById('history-container')
};

// Initialization
function init() {
    createBoardGrid();
    updateStatus();
    updateTokenPosition(1);

    els.rollBtn.addEventListener('click', handleRoll);
    els.submitBtn.addEventListener('click', handleSubmit);
    els.nextBtn.addEventListener('click', handleNextTurn);
    els.hintBtn.addEventListener('click', revealHint);
}

// Boustrophedon / Snake numbering for board squares
function createBoardGrid() {
    const totalSq = CONFIG.BOARD_SIZE;
    
    // 10x10 Grid. Square 1 at bottom-left, Square 10 at bottom-right.
    for (let row = 9; row >= 0; row--) {
        for (let col = 0; col < 10; col++) {
            const isLTR = (row % 2 === 0);
            const displayCol = isLTR ? col : (9 - col);
            const num = (row * 10) + displayCol + 1;

            const sq = document.createElement('div');
            sq.className = 'square';
            sq.innerText = num;
            sq.id = `sq-${num}`;

            if (SNAKES[num]) sq.classList.add('has-snake');
            if (LADDERS[num]) sq.classList.add('has-ladder');

            els.board.appendChild(sq);
        }
    }
}

function updateStatus() {
    els.turnDisp.innerText = state.turn;
    els.posDisp.innerText = state.playerPosition;
    els.scoreDisp.innerText = state.score;
    els.diffBadge.innerText = state.difficulty.toUpperCase();
}

function updateTokenPosition(pos) {
    if (pos < 1) pos = 1;
    if (pos > 100) pos = 100;
    
    state.playerPosition = pos;
    updateStatus();

    const index = pos - 1;
    const row = Math.floor(index / 10);
    const isLTR = (row % 2 === 0);
    const col = isLTR ? (index % 10) : (9 - (index % 10));

    // Place the token exactly in the grid cell
    const leftPct = col * 10 + 2; // + 2% offset for centering within the 10% cell
    const bottomPct = row * 10 + 2; 
    
    els.playerToken.style.left = `${leftPct}%`;
    els.playerToken.style.top = `${88 - row*10}%`; // Top starts from 0 at row 9.
}

async function handleRoll() {
    state.turn++;
    els.rollBtn.classList.add('hidden');
    els.loadingState.classList.remove('hidden');
    els.loadingText.innerText = "Gemini is generating a challenge...";

    const chType = CONFIG.CHALLENGE_TYPES[state.challengeTypeIdx];
    state.challengeTypeIdx = (state.challengeTypeIdx + 1) % CONFIG.CHALLENGE_TYPES.length;

    try {
        const challenge = await window.gemini.generateChallenge(chType, state.difficulty);
        state.currentChallenge = challenge;
        showChallenge();
    } catch (e) {
        console.error(e);
        alert("Failed to get challenge. Try again.");
        els.rollBtn.classList.remove('hidden');
        els.loadingState.classList.add('hidden');
    }
}

function showChallenge() {
    els.loadingState.classList.add('hidden');
    els.challengeCard.classList.remove('hidden');
    
    els.chTypeBadge.innerText = state.currentChallenge.type.toUpperCase();
    els.chQuestion.innerText = state.currentChallenge.question;
    
    els.chHint.innerText = state.currentChallenge.hint;
    els.chHint.classList.add('hidden');
    els.hintBtn.classList.remove('hidden');
    els.hintBtn.disabled = false;

    els.answerInput.value = "";
    els.answerInput.disabled = false;
    els.submitBtn.disabled = false;
    els.answerInput.focus();

    startTimer();
}

function revealHint() {
    if (state.score > 0) state.score--;
    updateStatus();
    els.hintBtn.classList.add('hidden');
    els.chHint.classList.remove('hidden');
}

function startTimer() {
    state.timeLeft = 30;
    els.timerBar.style.width = '100%';
    els.timerBar.style.backgroundColor = 'var(--gold)';
    els.timerBar.style.transition = 'none';
    
    void els.timerBar.offsetWidth; // Reflow
    
    els.timerBar.style.transition = 'width 1s linear, background-color 0.3s';

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        const pct = (state.timeLeft / 30) * 100;
        els.timerBar.style.width = `${pct}%`;
        
        if (state.timeLeft <= 10) els.timerBar.style.backgroundColor = 'var(--red-snake)';
        
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    els.answerInput.value = "TIME'S UP!";
    els.answerInput.disabled = true;
    handleSubmit();
}

async function handleSubmit() {
    clearInterval(state.timerInterval);
    const answer = els.answerInput.value.trim();
    
    els.answerInput.disabled = true;
    els.submitBtn.disabled = true;
    els.hintBtn.disabled = true;

    els.challengeCard.classList.add('hidden');
    els.loadingState.classList.remove('hidden');
    els.loadingText.innerText = "Gemini is evaluating your answer...";

    try {
        const evalRes = await window.gemini.evaluateAnswer(
            state.currentChallenge.question,
            answer,
            state.currentChallenge.keywords,
            state.currentChallenge.scoring_guide
        );
        showResult(evalRes, answer);
    } catch (e) {
        console.error(e);
        showResult({ score: 2, feedback: "Error evaluating. Partial score awarded.", correct_answer: state.currentChallenge.sample_good_answer }, answer);
    }
}

function showResult(evalRes, userAnswer) {
    els.loadingState.classList.add('hidden');
    els.resultCard.classList.remove('hidden');

    state.score += evalRes.score;
    // Animate score from 0 to actual
    let currentDispScore = 0;
    els.resScore.innerText = "0";
    const scoreInt = setInterval(() => {
        if(currentDispScore >= evalRes.score) {
            clearInterval(scoreInt);
        } else {
            currentDispScore++;
            els.resScore.innerText = currentDispScore;
        }
    }, 100);

    els.resFeedback.innerText = evalRes.feedback;
    els.resCorrect.innerText = evalRes.correct_answer || state.currentChallenge.sample_good_answer;
    els.resMove.innerText = `Moved ${evalRes.score} spaces!`;
    
    els.resEvent.classList.add('hidden');
    els.resEvent.className = 'event-msg hidden';

    // Move token
    const oldPos = state.playerPosition;
    let newPos = oldPos + evalRes.score;
    if (newPos >= 100) newPos = 100;

    setTimeout(() => {
        updateTokenPosition(newPos);
        
        setTimeout(() => {
            checkSnakesLadders(newPos);
        }, 600);
    }, 1000); 

    // Record history
    state.history.unshift({
        turn: state.turn,
        q: state.currentChallenge.question,
        a: userAnswer,
        score: evalRes.score
    });
    if (state.history.length > 5) state.history.pop();
    updateHistoryUI();
    adjustDifficulty();
}

function checkSnakesLadders(pos) {
    let finalPos = pos;
    if (SNAKES[pos]) {
        finalPos = SNAKES[pos];
        els.resEvent.innerText = `🐍 Oh no! Snake bit you down to ${finalPos}`;
        els.resEvent.classList.remove('hidden');
        els.resEvent.classList.add('event-snake');
        els.playerToken.classList.add('anim-shake');
        setTimeout(() => { els.playerToken.classList.remove('anim-shake'); }, 400);
    } else if (LADDERS[pos]) {
        finalPos = LADDERS[pos];
        els.resEvent.innerText = `🪜 Awesome! Climbed a ladder to ${finalPos}`;
        els.resEvent.classList.remove('hidden');
        els.resEvent.classList.add('event-ladder');
        els.playerToken.classList.add('anim-bounce');
        setTimeout(() => { els.playerToken.classList.remove('anim-bounce'); }, 400);
    }

    if (finalPos !== pos) {
        setTimeout(() => {
            updateTokenPosition(finalPos);
            checkWin(finalPos);
        }, 800);
    } else {
        checkWin(finalPos);
    }
}

function checkWin(pos) {
    if (pos >= 100) {
        els.resFeedback.innerText = "🎉 YOU WON THE GAME! 🎉";
        els.nextBtn.innerText = "PLAY AGAIN";
    }
}

function handleNextTurn() {
    if (state.playerPosition >= 100) {
        // Reset game
        state.playerPosition = 1;
        state.score = 0;
        state.turn = 0;
        state.difficulty = "medium";
        state.history = [];
        updateHistoryUI();
        updateTokenPosition(1);
        updateStatus();
        els.nextBtn.innerText = "NEXT TURN";
    }

    els.resultCard.classList.add('hidden');
    els.rollBtn.classList.remove('hidden');
}

function updateHistoryUI() {
    els.historyContainer.innerHTML = '';
    state.history.forEach(h => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span>T${h.turn}: ${h.q.substring(0, 20)}...</span><span class="history-item-score">+${h.score}</span>`;
        els.historyContainer.appendChild(div);
    });
}

function adjustDifficulty() {
    if (state.history.length >= 3) {
        const last3 = state.history.slice(0,3).reduce((sum, h) => sum + h.score, 0) / 3;
        if (last3 >= 5 && state.difficulty !== "hard") {
            state.difficulty = "hard";
        } else if (last3 <= 2 && state.difficulty !== "easy") {
            state.difficulty = "easy";
        } else if (last3 > 2 && last3 < 5) {
            state.difficulty = "medium";
        }
        updateStatus();
    }
}

window.addEventListener('DOMContentLoaded', init);
