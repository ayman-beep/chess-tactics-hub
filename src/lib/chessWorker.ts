import { Chess } from 'chess.js';
import { evaluatePosition } from './evaluation';

// Simple cache with size limit
const MAX_CACHE_SIZE = 5000;
const cache = new Map<string, { score: number; depth: number }>();

const addToCache = (key: string, score: number, depth: number) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { score, depth });
};

const pieceValues: { [key: string]: number } = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

const orderMoves = (chess: Chess, moves: any[]): any[] => {
  return moves.map(move => {
    let score = 0;
    
    // Prioritize captures
    if (move.captured) {
      score += (pieceValues[move.captured] || 0) * 10 - (pieceValues[move.piece] || 0);
    }
    
    // Prioritize checks
    chess.move(move);
    if (chess.inCheck()) score += 50;
    chess.undo();
    
    // Prioritize promotions
    if (move.promotion) score += 80;
    
    // Center control
    if (['e4', 'e5', 'd4', 'd5'].includes(move.to)) score += 10;
    
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
  nodeCount: { value: number }
): { moves: any[]; score: number } => {
  
  // Safety limits
  nodeCount.value++;
  if (nodeCount.value > 50000) {
    return { moves: [], score: 0 };
  }
  
  const fen = chess.fen();
  const cached = cache.get(fen);
  if (cached && cached.depth >= depth) {
    return { moves: [], score: cached.score };
  }
  
  // Base case
  if (depth === 0 || chess.isGameOver()) {
    const score = evaluatePosition(chess);
    // Ensure it's a plain number
    const safeScore = Math.round(Number(score) || 0);
    addToCache(fen, safeScore, 0);
    return { moves: [], score: safeScore };
  }
  
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return { moves: [], score: 0 };
  }
  
  const orderedMoves = orderMoves(chess, moves);
  const searchWidth = depth > 4 ? Math.min(12, orderedMoves.length) : orderedMoves.length;
  
  let bestScore = isMaximizing ? -999999 : 999999;
  let bestLine: any[] = [];
  
  for (let i = 0; i < searchWidth; i++) {
    const move = orderedMoves[i];
    chess.move(move);
    
    const result = minimax(chess, depth - 1, alpha, beta, !isMaximizing, nodeCount);
    chess.undo();
    
    // Ensure safe number arithmetic
    const resultScore = Math.round(Number(result.score) || 0);
    
    if (isMaximizing) {
      if (resultScore > bestScore) {
        bestScore = resultScore;
        bestLine = [move, ...result.moves];
      }
      alpha = Math.max(alpha, resultScore);
    } else {
      if (resultScore < bestScore) {
        bestScore = resultScore;
        bestLine = [move, ...result.moves];
      }
      beta = Math.min(beta, resultScore);
    }
    
    // Alpha-beta pruning
    if (beta <= alpha) break;
  }
  
  addToCache(fen, bestScore, depth);
  
  return { moves: bestLine, score: bestScore };
};

// Worker message handler
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;
  
  if (type === 'analyze') {
    const { fen, depth, id } = data;
    
    try {
      const chess = new Chess(fen);
      const nodeCount = { value: 0 };
      
      const result = minimax(
        chess, 
        Math.min(depth, 8), // Cap depth at 8 for stability
        -999999, 
        999999, 
        chess.turn() === 'w', 
        nodeCount
      );
      
      self.postMessage({
        type: 'result',
        data: {
          id,
          moves: result.moves.slice(0, 10),
          score: Math.round(Number(result.score) || 0),
          fen,
          nodesSearched: nodeCount.value
        }
      });
    } catch (error) {
      console.error('Worker error:', error);
      self.postMessage({
        type: 'error',
        data: {
          id,
          error: error instanceof Error ? error.message : 'Analysis failed'
        }
      });
    }
  } else if (type === 'clear-cache') {
    cache.clear();
    self.postMessage({ type: 'cache-cleared' });
  }
};
