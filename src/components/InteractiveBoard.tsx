import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";

interface InteractiveBoardProps {
  initialFen: string;
  solution: string[];
  onCorrect: () => void;
  onWrong: () => void;
  playerSide: 'w' | 'b';
}

export const InteractiveBoard = ({ initialFen, solution, onCorrect, onWrong, playerSide }: InteractiveBoardProps) => {
  const [chess, setChess] = useState(new Chess(initialFen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [message, setMessage] = useState("Your turn! Make the best move.");
  const [showingSolution, setShowingSolution] = useState(false);

  // Use proper Unicode symbols - white pieces (filled) vs black pieces (outlined)
  const pieceSymbols: { [key: string]: string } = {
    'p': '♟︎', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',  // Black pieces
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'   // White pieces
  };

  const reset = () => {
    setChess(new Chess(initialFen));
    setSelectedSquare(null);
    setCurrentMoveIndex(0);
    setMessage("Your turn! Make the best move.");
    setShowingSolution(false);
  };

  const showSolution = () => {
    setShowingSolution(true);
    const solutionChess = new Chess(initialFen);
    
    // Play through the entire solution
    solution.forEach(move => {
      solutionChess.move(move);
    });
    
    setChess(solutionChess);
    setMessage(`Solution: ${solution.join(' → ')}`);
    setCurrentMoveIndex(solution.length);
  };

  const makeMove = (from: string, to: string) => {
    const newChess = new Chess(chess.fen());
    const move = newChess.move({ from, to, promotion: 'q' });
    
    if (!move) return false;

    const expectedMove = solution[currentMoveIndex];
    
    if (move.san === expectedMove) {
      setChess(newChess);
      setSelectedSquare(null);
      
      if (currentMoveIndex === solution.length - 1) {
        setMessage("🎉 Perfect! You solved it!");
        onCorrect();
        return true;
      }
      
      setCurrentMoveIndex(currentMoveIndex + 1);
      setMessage("✓ Correct! Continue...");
      
      // Make opponent's move if there's another move in solution
      if (currentMoveIndex + 1 < solution.length) {
        setTimeout(() => {
          const opponentChess = new Chess(newChess.fen());
          opponentChess.move(solution[currentMoveIndex + 1]);
          setChess(opponentChess);
          setCurrentMoveIndex(currentMoveIndex + 2);
          setMessage("Your turn again!");
        }, 500);
      }
      
      return true;
    } else {
      setMessage("❌ Not quite! Try again or reset.");
      onWrong();
      return false;
    }
  };

  const handleSquareClick = (square: string, piece: any) => {
    if (selectedSquare) {
      makeMove(selectedSquare, square);
      setSelectedSquare(null);
    } else if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
    }
  };

  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  // Flip board if playing as black
  const ranks = playerSide === 'w' 
    ? ['8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  const displayBoard = playerSide === 'w' ? board : [...board].reverse();
  const displayFiles = playerSide === 'w' ? files : [...files].reverse();

  return (
    <div className="space-y-4">
      <div className="text-center font-medium">{message}</div>
      
      <div className="grid grid-cols-8 gap-0 w-full max-w-[320px] mx-auto border-2 border-border rounded-lg overflow-hidden shadow-lg">
        {displayBoard.map((row, i) =>
          row.map((square, j) => {
            const isLight = (i + j) % 2 === 0;
            const squareNotation = `${displayFiles[j]}${ranks[i]}`;
            const isSelected = selectedSquare === squareNotation;
            const isWhitePiece = square && square.color === 'w';
            const piece = square ? pieceSymbols[square.type] : null;
            
            return (
              <button
                key={`${i}-${j}`}
                onClick={() => handleSquareClick(squareNotation, square)}
                disabled={showingSolution}
                className={`aspect-square flex items-center justify-center text-4xl font-bold transition-colors ${
                  isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                } ${isSelected ? 'ring-4 ring-primary' : ''} ${
                  showingSolution ? 'cursor-not-allowed' : 'hover:brightness-95'
                }`}
              >
                {piece && (
                  <span 
                    className={isWhitePiece ? 'text-[#ffffff]' : 'text-[#000000]'}
                    style={{
                      filter: isWhitePiece
                        ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))'
                        : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      WebkitTextStroke: isWhitePiece ? '0.5px rgba(0,0,0,0.2)' : '0.5px rgba(0,0,0,0.4)'
                    }}
                  >
                    {piece}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
      
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" className="flex-1">
          Reset
        </Button>
        <Button onClick={showSolution} variant="secondary" className="flex-1" disabled={showingSolution}>
          Show Solution
        </Button>
      </div>
    </div>
  );
};
