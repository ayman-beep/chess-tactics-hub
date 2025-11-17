import { Chess } from 'chess.js';

export interface Tactic {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  evaluation: number;
}

const pieceValues: { [key: string]: number } = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

const evaluatePosition = (chess: Chess): number => {
  let score = 0;
  const board = chess.board();
  
  board.forEach((row, rank) => {
    row.forEach((square, file) => {
      if (square) {
        let value = pieceValues[square.type];
        
        // Add positional bonuses
        if (square.type === 'p') {
          // Pawns are worth more when advanced
          const advancementBonus = square.color === 'w' ? (6 - rank) * 0.1 : rank * 0.1;
          value += advancementBonus;
        }
        
        // Center control bonus
        if ((rank === 3 || rank === 4) && (file === 3 || file === 4)) {
          value += 0.3;
        }
        
        score += square.color === 'w' ? value : -value;
      }
    });
  });
  
  // King safety penalty if in check
  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -2 : 2;
  }
  
  return score;
};

const getMaterialCount = (chess: Chess, color: 'w' | 'b'): number => {
  let material = 0;
  const board = chess.board();
  
  board.forEach(row => {
    row.forEach(square => {
      if (square && square.color === color) {
        material += pieceValues[square.type];
      }
    });
  });
  
  return material;
};

const findBestLine = (chess: Chess, depth: number = 6): { moves: any[]; score: number } => {
  const result = minimax(chess, depth, -Infinity, Infinity, true, []);
  return result;
};

const minimax = (
  chess: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean,
  currentLine: any[]
): { moves: any[]; score: number } => {
  
  if (depth === 0 || chess.isGameOver()) {
    return { moves: currentLine, score: evaluatePosition(chess) };
  }
  
  const moves = chess.moves({ verbose: true });
  
  // Prioritize forcing moves (checks and captures)
  moves.sort((a, b) => {
    const aScore = (a.captured ? pieceValues[a.captured] * 10 : 0) + 
                   (a.flags.includes('c') ? 100 : 0) + // Check
                   (a.flags.includes('p') ? 50 : 0);   // Promotion
    const bScore = (b.captured ? pieceValues[b.captured] * 10 : 0) + 
                   (b.flags.includes('c') ? 100 : 0) + 
                   (b.flags.includes('p') ? 50 : 0);
    return bScore - aScore;
  });
  
  let bestLine = { moves: currentLine, score: isMaximizing ? -Infinity : Infinity };
  
  for (const move of moves.slice(0, Math.max(10, moves.length))) {
    chess.move(move);
    const result = minimax(chess, depth - 1, alpha, beta, !isMaximizing, [...currentLine, move]);
    chess.undo();
    
    if (isMaximizing) {
      if (result.score > bestLine.score) {
        bestLine = result;
      }
      alpha = Math.max(alpha, result.score);
    } else {
      if (result.score < bestLine.score) {
        bestLine = result;
      }
      beta = Math.min(beta, result.score);
    }
    
    if (beta <= alpha) break;
  }
  
  return bestLine;
};

const isTacticalPosition = (chess: Chess, move: any): { isTactical: boolean; materialGain: number; difficulty: "easy" | "medium" | "hard" } => {
  const beforeMaterial = getMaterialCount(chess, chess.turn());
  const beforeEval = evaluatePosition(chess);
  const isCheck = move.flags.includes('c') || move.flags.includes('+') || move.san.includes('+');
  const isCapture = !!move.captured;
  
  chess.move(move);
  
  // Look ahead to see if this leads to material gain - use depth 6 for accurate evaluation
  const response = findBestLine(chess, 6);
  const afterEval = -response.score; // Negate because perspective flipped
  
  chess.undo();
  
  const evalSwing = afterEval - beforeEval;
  const materialGain = isCapture ? pieceValues[move.captured] : 0;
  
  // A position is tactical if:
  // 1. It's a check that leads to advantage
  // 2. It's a capture that wins material
  // 3. It creates a forcing sequence with significant eval swing
  // 4. It leads to checkmate threats
  
  const isTactical = (
    (isCheck && evalSwing > 1) ||
    (isCapture && evalSwing > 1.5) ||
    (evalSwing > 2.5) ||
    chess.isCheckmate()
  );
  
  let difficulty: "easy" | "medium" | "hard" = "easy";
  if (evalSwing > 5 || (isCheck && isCapture)) {
    difficulty = "hard";
  } else if (evalSwing > 3 || isCheck) {
    difficulty = "medium";
  }
  
  return { isTactical, materialGain, difficulty };
};

export const generateTactics = (games: any[]): Tactic[] => {
  const tactics: Tactic[] = [];
  const seenPositions = new Set<string>();
  
  games.forEach(game => {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      
      const history = chess.history({ verbose: true });
      
      // Analyze each move in the game
      for (let i = 8; i < history.length - 3; i++) {
        chess.reset();
        
        // Replay to the position BEFORE the tactical move
        for (let j = 0; j < i; j++) {
          chess.move(history[j]);
        }
        
        const fenBefore = chess.fen();
        
        // Skip if we've seen this position
        if (seenPositions.has(fenBefore)) continue;
        
        const actualMove = history[i];
        const tacticalInfo = isTacticalPosition(chess, actualMove);
        
        if (tacticalInfo.isTactical) {
          // Generate the full solution line
          const solution: string[] = [];
          const solutionChess = new Chess(fenBefore);

          // Add the key tactical move
          solutionChess.move(actualMove);
          solution.push(actualMove.san);

          // Add the likely response and continuation using depth 6 for accurate lines
          const continuation = findBestLine(solutionChess, 6);
          for (let k = 0; k < Math.min(3, continuation.moves.length); k++) {
            if (continuation.moves[k]) {
              solution.push(continuation.moves[k].san);
              solutionChess.move(continuation.moves[k]);
            }
          }

          // Calculate the evaluation change from this tactical sequence
          const evalBefore = evaluatePosition(new Chess(fenBefore));
          const evalAfter = evaluatePosition(solutionChess);
          const evaluation = evalAfter - evalBefore;

          tactics.push({
            fen: fenBefore,
            solution: solution.slice(0, 4), // Limit to 4 moves
            difficulty: tacticalInfo.difficulty,
            gameUrl: game.url,
            evaluation: evaluation
          });

          seenPositions.add(fenBefore);

          // Limit tactics per game
          if (tactics.length >= 15) break;
        }
      }
    } catch (error) {
      console.error('Error processing game:', error);
    }
  });
  
  // Sort by difficulty and return up to 10 best tactics
  tactics.sort((a, b) => {
    const difficultyOrder = { hard: 3, medium: 2, easy: 1 };
    return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
  });
  
  return tactics.slice(0, 10);
};
