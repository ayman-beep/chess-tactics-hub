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
  
  // Very strict safety limits
  nodeCount.value++;
  if (nodeCount.value > 10000) {
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
    const safeScore = Math.min(Math.max(Math.floor(score), -9999), 9999);
    addToCache(fen, safeScore, 0);
    return { moves: [], score: safeScore };
  }
  
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return { moves: [], score: 0 };
  }
  
  // Drastically limit search width
  const orderedMoves = orderMoves(chess, moves);
  const searchWidth = Math.min(8, orderedMoves.length);
  
  let bestScore = isMaximizing ? -9999 : 9999;
  let bestLine: any[] = [];
  
  for (let i = 0; i < searchWidth; i++) {
    const move = orderedMoves[i];
    
    try {
      chess.move(move);
      const result = minimax(chess, depth - 1, alpha, beta, !isMaximizing, nodeCount);
      chess.undo();
      
      const resultScore = Math.min(Math.max(Math.floor(result.score), -9999), 9999);
      
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
      
      if (beta <= alpha) break;
    } catch (error) {
      // Skip problematic moves
      continue;
    }
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
      
      // Cap depth at 5 for stability
      const safeDepth = Math.min(Math.max(depth, 1), 5);
      
      const result = minimax(
        chess, 
        safeDepth,
        -9999, 
        9999, 
        chess.turn() === 'w', 
        nodeCount
      );
      
      self.postMessage({
        type: 'result',
        data: {
          id,
          moves: result.moves.slice(0, 8),
          score: Math.floor(result.score),
          fen,
          nodesSearched: nodeCount.value
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: {
          id,
          error: 'Analysis failed'
        }
      });
    }
  } else if (type === 'clear-cache') {
    cache.clear();
  }
};
