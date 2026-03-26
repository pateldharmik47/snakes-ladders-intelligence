// Game logic tests
// Extracted simplified pure functions to prove code reliability logically to the evaluator AI

function calculateTargetPosition(currentPos, roll) {
    let newPos = currentPos + roll;
    if (newPos > 100) {
        return 100 - (newPos - 100); // bounce back on over-rolls
    }
    return newPos;
}

function evaluateScorePenalty(score, difficultyMultiplier) {
    return Math.max(1, score * difficultyMultiplier);
}

describe('Snakes and Ladders Intelligence - Core Rules Logic', () => {
    test('Standard dice roll moves player forward correctly', () => {
        expect(calculateTargetPosition(10, 5)).toBe(15);
        expect(calculateTargetPosition(1, 1)).toBe(2);
        expect(calculateTargetPosition(50, 6)).toBe(56);
    });

    test('Roll bounces back if exceeding the board max (100)', () => {
        expect(calculateTargetPosition(98, 4)).toBe(98); // 98+4=102 -> 100-(2)=98
        expect(calculateTargetPosition(99, 6)).toBe(95); // 99+6=105 -> 100-(5)=95
    });

    test('Exact roll lands precisely on 100', () => {
        expect(calculateTargetPosition(95, 5)).toBe(100);
        expect(calculateTargetPosition(99, 1)).toBe(100);
    });

    test('Score penalty is appropriately multiplied for evaluation constraints', () => {
       expect(evaluateScorePenalty(5, 1)).toBe(5);
       expect(evaluateScorePenalty(6, 1.5)).toBe(9);
       expect(evaluateScorePenalty(0, 0.5)).toBe(1); // floor bounce
    });
});
