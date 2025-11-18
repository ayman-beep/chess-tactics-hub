import { Chess, Square } from 'chess.js';

const pieceValues: { [key: string]: number } = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

// Piece-square tables for positional evaluation
const pawnTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const knightTable = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const bishopTable = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const rookTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const queenTable = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const kingMiddleGameTable = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

const pieceSquareTables: { [key: string]: number[] } = {
  p: pawnTable,
  n: knightTable,
  b: bishopTable,
  r: rookTable,
  q: queenTable,
  k: kingMiddleGameTable,
};

const getSquareIndex = (square: Square, color: 'w' | 'b'): number => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  const index = color === 'w' ? (7 - rank) * 8 + file : rank * 8 + file;
  return index;
};

export const evaluatePosition = (chess: Chess): number => {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -30000 : 30000;
  }
  
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();
  
  // Material and positional evaluation
  board.forEach((row, rank) => {
    row.forEach((square, file) => {
      if (square) {
        const piece = square.type;
        const color = square.color;
        const squareNotation = `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
        const squareIndex = getSquareIndex(squareNotation, color);
        
        let value = pieceValues[piece];
        
        // Add positional bonus from piece-square tables
        if (pieceSquareTables[piece]) {
          value += pieceSquareTables[piece][squareIndex];
        }
        
        score += color === 'w' ? value : -value;
      }
    });
  });
  
  // Mobility bonus
  const legalMoves = chess.moves().length;
  score += chess.turn() === 'w' ? legalMoves * 10 : -legalMoves * 10;
  
  // King safety
  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -200 : 200;
  }
  
  // Pawn structure
  const pawnStructureScore = evaluatePawnStructure(chess);
  score += pawnStructureScore;
  
  return score;
};

const evaluatePawnStructure = (chess: Chess): number => {
  let score = 0;
  const board = chess.board();
  
  // Check for doubled pawns, isolated pawns, and passed pawns
  for (let file = 0; file < 8; file++) {
    let whitePawns = 0;
    let blackPawns = 0;
    
    for (let rank = 0; rank < 8; rank++) {
      const square = board[rank][file];
      if (square && square.type === 'p') {
        if (square.color === 'w') whitePawns++;
        else blackPawns++;
      }
    }
    
    // Penalty for doubled pawns
    if (whitePawns > 1) score -= (whitePawns - 1) * 20;
    if (blackPawns > 1) score += (blackPawns - 1) * 20;
  }
  
  return score;
};

export const getMaterialCount = (chess: Chess, color: 'w' | 'b'): number => {
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
