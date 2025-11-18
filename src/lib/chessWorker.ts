import { Chess } from 'chess.js';
import { evaluatePosition } from './evaluation';

// Transposition table for caching positions
const transpositionTable = new Map<string, { score: number; depth: number; bestMove: any }>();

const pieceValues: { [key: string]: number } = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

const orderMoves = (chess: Chess, moves: any[]): any[] => {
  return moves.map(move => {
    let score = 0;
    
    if (move.captured) {
      score += pieceValues[move.captured] * 10 - pieceValues[move.piece];
    }
    
    chess.move(move);
    if (chess.inCheck()) {
      score += 1000;
    }
    chess.undo();
    
    if (move.promotion) {
      score += pieceValues[move.promotion];
    }
    
    if (['e4', 'e5', 'd4', 'd5'].includes(move.to)) {
      score += 50;
    }
    
    return { move, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.move);
};

const minimax = (
  chess: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean,
  currentLine: any[]
): { moves: any[]; score: number } => {
  
  const zobristKey = chess.fen();
  const cached = transpositionTable.get(zobristKey);
  if (cached && cached.depth >= depth) {
    return { moves: currentLine, score: cached.score };
  }
  
  if (depth === 0 || chess.isGameOver()) {
    const score = evaluatePosition(chess);
    return { moves: currentLine, score };
  }
  
  const moves = chess.moves({ verbose: true });
  const orderedMoves = orderMoves(chess, moves);
  
  let bestLine = { moves: currentLine, score: isMaximizing ? -Infinity : Infinity };
  let bestMove = null;
  
  const searchWidth = depth > 8 ? Math.min(25, orderedMoves.length) : orderedMoves.length;
  
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
        bestMove = move;
      }
      alpha = Math.max(alpha, result.score);
    } else {
      if (result.score < bestLine.score) {
        bestLine = result;
        bestMove = move;
      }
      beta = Math.min(beta, result.score);
    }
    
    if (beta <= alpha) {
      break;
    }
  }
  
  if (bestMove) {
    transpositionTable.set(zobristKey, { 
      score: bestLine.score, 
      depth, 
      bestMove 
    });
  }
  
  return bestLine;
};

// Worker message handler
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;
  
  if (type === 'analyze') {
    const { fen, depth, id } = data;
    const chess = new Chess(fen);
    
    try {
      const result = minimax(chess, depth, -Infinity, Infinity, chess.turn() === 'w', []);
      
      self.postMessage({
        type: 'result',
        data: {
          id,
          moves: result.moves,
          score: result.score,
          fen
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: {
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  } else if (type === 'clear-cache') {
    transpositionTable.clear();
    self.postMessage({ type: 'cache-cleared' });
  }
};
