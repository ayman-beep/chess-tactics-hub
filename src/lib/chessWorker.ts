import { Chess } from 'chess.js';
import { evaluatePosition } from './evaluation';

// Transposition table for caching positions (limited size to prevent memory overflow)
const MAX_CACHE_SIZE = 10000;
const transpositionTable = new Map<string, { score: number; depth: number; bestMove: any }>();

const addToCache = (key: string, value: { score: number; depth: number; bestMove: any }) => {
  if (transpositionTable.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first entry in Map)
    const firstKey = transpositionTable.keys().next().value;
    transpositionTable.delete(firstKey);
  }
  transpositionTable.set(key, value);
};

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
  currentLine: any[],
  nodeCount = { value: 0 }
): { moves: any[]; score: number } => {
  
  // Safety check: limit total nodes searched to prevent infinite loops
  nodeCount.value++;
  if (nodeCount.value > 100000) {
    return { moves: currentLine, score: evaluatePosition(chess) };
  }
  
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
  
  const searchWidth = depth > 6 ? Math.min(15, orderedMoves.length) : orderedMoves.length;
  
  for (let i = 0; i < searchWidth; i++) {
    const move = orderedMoves[i];
    chess.move(move);
    
    const result = minimax(
      chess, 
      depth - 1, 
      alpha, 
      beta, 
      !isMaximizing, 
      [...currentLine, move],
      nodeCount
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
    addToCache(zobristKey, { 
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
      const nodeCount = { value: 0 };
      const result = minimax(chess, depth, -Infinity, Infinity, chess.turn() === 'w', [], nodeCount);
      
      self.postMessage({
        type: 'result',
        data: {
          id,
          moves: result.moves,
          score: result.score,
          fen,
          nodesSearched: nodeCount.value
        }
      });
    } catch (error) {
      console.error('Worker analysis error:', error);
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
