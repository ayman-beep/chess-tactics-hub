import { Chess } from '@chessle/chess.js-extended';
import { evaluatePosition } from './evaluation';

const pieceValues: { [key: string]: number } = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

const orderMoves = (chess: Chess, moves: any[]): any[] => {
  return moves.map(move => {
    let score = 0;
    
    // Prioritize captures by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (move.captured) {
      score += pieceValues[move.captured] * 10 - pieceValues[move.piece];
    }
    
    // Prioritize checks
    chess.move(move);
    if (chess.inCheck()) {
      score += 1000;
    }
    chess.undo();
    
    // Prioritize promotions
    if (move.promotion) {
      score += pieceValues[move.promotion];
    }
    
    // Prioritize center control
    if (['e4', 'e5', 'd4', 'd5'].includes(move.to)) {
      score += 50;
    }
    
    return { move, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.move);
};

export const findBestLine = (chess: Chess, depth: number = 12): { moves: any[]; score: number } => {
  const result = minimax(chess, depth, -Infinity, Infinity, chess.turn() === 'w', []);
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
  
  // Order moves for better alpha-beta pruning
  const orderedMoves = orderMoves(chess, moves);
  
  let bestLine = { moves: currentLine, score: isMaximizing ? -Infinity : Infinity };
  
  // Limit search width at higher depths to improve performance
  const searchWidth = depth > 6 ? Math.min(20, orderedMoves.length) : orderedMoves.length;
  
  for (let i = 0; i < searchWidth; i++) {
    const move = orderedMoves[i];
    chess.move(move);
    
    const result = minimax(
      chess, 
      depth - 1, 
      alpha, 
      beta, 
      !isMaximizing, 
      [...currentLine, move]
    );
    
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
    
    if (beta <= alpha) {
      break; // Alpha-beta cutoff
    }
  }
  
  return bestLine;
};

// Quiescence search for tactical positions
export const quiescenceSearch = (chess: Chess, alpha: number, beta: number): number => {
  const standPat = evaluatePosition(chess);
  
  if (standPat >= beta) {
    return beta;
  }
  
  if (alpha < standPat) {
    alpha = standPat;
  }
  
  const captures = chess.moves({ verbose: true }).filter(m => m.captured);
  const orderedCaptures = orderMoves(chess, captures);
  
  for (const move of orderedCaptures) {
    chess.move(move);
    const score = -quiescenceSearch(chess, -beta, -alpha);
    chess.undo();
    
    if (score >= beta) {
      return beta;
    }
    if (score > alpha) {
      alpha = score;
    }
  }
  
  return alpha;
};
