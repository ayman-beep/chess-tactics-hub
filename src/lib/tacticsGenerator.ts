import { Chess } from 'chess.js';

export interface Tactic {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
}

const evaluatePosition = (chess: Chess): number => {
  const pieceValues: { [key: string]: number } = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
  };
  
  let score = 0;
  const board = chess.board();
  
  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        const value = pieceValues[square.type];
        score += square.color === 'w' ? value : -value;
      }
    });
  });
  
  return score;
};

const findBestMove = (chess: Chess, depth: number = 2): { move: any; score: number } | null => {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  let bestMove = moves[0];
  let bestScore = -Infinity;
  
  for (const move of moves) {
    chess.move(move);
    const score = -minimax(chess, depth - 1, -Infinity, Infinity, false);
    chess.undo();
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return { move: bestMove, score: bestScore };
};

const minimax = (chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess);
  }
  
  const moves = chess.moves({ verbose: true });
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const score = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      chess.move(move);
      const score = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
};

export const generateTactics = (games: any[]): Tactic[] => {
  const tactics: Tactic[] = [];
  
  games.forEach(game => {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      
      const history = chess.history({ verbose: true });
      
      // Look for tactical positions every 5-8 moves
      for (let i = 10; i < history.length - 5; i += Math.floor(Math.random() * 4) + 5) {
        chess.reset();
        
        // Replay to this position
        for (let j = 0; j < i; j++) {
          chess.move(history[j]);
        }
        
        const currentEval = evaluatePosition(chess);
        const result = findBestMove(chess, 2);
        
        if (!result) continue;
        
        chess.move(result.move);
        const newEval = evaluatePosition(chess);
        const evalDiff = Math.abs(newEval - currentEval);
        
        // If the move significantly changes the evaluation, it's likely tactical
        if (evalDiff > 2) {
          const fen = chess.fen();
          chess.undo();
          
          // Generate solution line
          const solution = [result.move.san];
          chess.move(result.move);
          
          const nextBest = findBestMove(chess, 1);
          if (nextBest) {
            solution.push(nextBest.move.san);
          }
          
          const difficulty = evalDiff > 5 ? "hard" : evalDiff > 3 ? "medium" : "easy";
          
          tactics.push({
            fen: fen,
            solution,
            difficulty,
            gameUrl: game.url
          });
          
          // Reset for next iteration
          chess.reset();
          for (let j = 0; j < i; j++) {
            chess.move(history[j]);
          }
        }
      }
    } catch (error) {
      console.error('Error processing game:', error);
    }
  });
  
  // Return up to 10 unique tactics
  return tactics.slice(0, 10);
};
