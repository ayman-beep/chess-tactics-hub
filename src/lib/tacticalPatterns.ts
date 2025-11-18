import { Chess } from 'chess.js';
import { evaluatePosition } from './evaluation';

export type TacticalPattern = 'fork' | 'pin' | 'skewer' | 'discovered-attack' | 'sacrifice' | 'mate-threat' | 'forcing';

export interface TacticalInfo {
  isTactical: boolean;
  patterns: TacticalPattern[];
  materialGain: number;
  difficulty: 'easy' | 'medium' | 'hard';
  evalSwing: number;
}

export const analyzeTacticalPosition = (chess: Chess, move: any, continuation: any[]): TacticalInfo => {
  const beforeEval = evaluatePosition(chess);
  const isCheck = move.san.includes('+') || move.san.includes('#');
  const isCapture = !!move.captured;
  
  chess.move(move);
  
  // Play out the continuation to get final evaluation
  const continuationChess = new Chess(chess.fen());
  for (const contMove of continuation) {
    if (contMove) {
      try {
        continuationChess.move(contMove);
      } catch {
        break;
      }
    }
  }
  
  const afterEval = evaluatePosition(continuationChess);
  chess.undo();
  
  // Calculate evaluation swing from current player's perspective
  const evalSwing = Math.abs(afterEval - beforeEval);
  
  // Detect tactical patterns
  const patterns = detectPatterns(chess, move, continuation);
  
  // A position is tactical if it has significant evaluation improvement
  const isTactical = (
    patterns.length > 0 ||
    evalSwing > 300 || // At least 3 pawns advantage
    (isCheck && evalSwing > 150) ||
    (isCapture && evalSwing > 200) ||
    continuationChess.isCheckmate()
  );
  
  // Determine difficulty based on evaluation swing and patterns
  let difficulty: 'easy' | 'medium' | 'hard';
  if (evalSwing > 800 || patterns.includes('mate-threat') || continuationChess.isCheckmate()) {
    difficulty = 'hard';
  } else if (evalSwing > 500 || patterns.length > 1) {
    difficulty = 'medium';
  } else {
    difficulty = 'easy';
  }
  
  const materialGain = move.captured ? 
    { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }[move.captured] || 0 : 0;
  
  return {
    isTactical,
    patterns,
    materialGain,
    difficulty,
    evalSwing
  };
};

const detectPatterns = (chess: Chess, move: any, continuation: any[]): TacticalPattern[] => {
  const patterns: TacticalPattern[] = [];
  
  chess.move(move);
  
  // Check for checkmate threat
  if (chess.isCheckmate()) {
    patterns.push('mate-threat');
    chess.undo();
    return patterns;
  }
  
  // Check for forcing moves (checks that lead to advantage)
  if (chess.inCheck() && continuation.length > 0) {
    patterns.push('forcing');
  }
  
  // Check for forks (one piece attacking multiple pieces)
  if (detectFork(chess, move)) {
    patterns.push('fork');
  }
  
  // Check for pins
  if (detectPin(chess, move)) {
    patterns.push('pin');
  }
  
  // Check for sacrifice patterns (losing material temporarily for advantage)
  if (move.captured && continuation.length > 0) {
    const beforeMaterial = getMaterialDifference(new Chess(chess.fen()));
    
    const testChess = new Chess(chess.fen());
    continuation.slice(0, 2).forEach(m => {
      if (m) {
        try {
          testChess.move(m);
        } catch {}
      }
    });
    
    const afterMaterial = getMaterialDifference(testChess);
    
    if (afterMaterial > beforeMaterial + 200) {
      patterns.push('sacrifice');
    }
  }
  
  chess.undo();
  
  return patterns;
};

const detectFork = (chess: Chess, move: any): boolean => {
  // Get the piece that just moved
  const piece = chess.get(move.to as any);
  if (!piece) return false;
  
  // Get all squares this piece attacks
  const moves = chess.moves({ square: move.to as any, verbose: true });
  
  // Count valuable pieces being attacked
  const valuablePieces = ['q', 'r', 'n', 'b'];
  const attackedValuablePieces = moves.filter(m => 
    m.captured && valuablePieces.includes(m.captured)
  );
  
  return attackedValuablePieces.length >= 2;
};

const detectPin = (chess: Chess, move: any): boolean => {
  // This is a simplified pin detection
  // A real implementation would need to check if a piece is pinned to a more valuable piece
  
  const board = chess.board();
  const movedPiece = chess.get(move.to as any);
  
  if (!movedPiece || !['r', 'b', 'q'].includes(movedPiece.type)) {
    return false;
  }
  
  // Check if this piece is attacking through another piece to a more valuable piece
  const moves = chess.moves({ square: move.to as any, verbose: true });
  
  // Simplified: if we're attacking a piece that can't move without exposing the king
  return moves.some(m => {
    if (!m.captured) return false;
    
    const testChess = new Chess(chess.fen());
    testChess.move(m);
    
    // If moving that piece would put king in check, it was pinned
    return testChess.inCheck();
  });
};

const getMaterialDifference = (chess: Chess): number => {
  const pieceValues: { [key: string]: number } = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 0
  };
  
  let white = 0, black = 0;
  const board = chess.board();
  
  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        const value = pieceValues[square.type];
        if (square.color === 'w') white += value;
        else black += value;
      }
    });
  });
  
  return chess.turn() === 'w' ? white - black : black - white;
};
