import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chess } from "chess.js";
import { InteractiveBoard } from "./InteractiveBoard";

interface TacticCardProps {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  index: number;
  evaluation: number;
}

export const TacticCard = ({ fen, solution, difficulty, gameUrl, index, evaluation }: TacticCardProps) => {
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);

  const formatEvaluation = (value: number) => {
    const absEval = Math.abs(value).toFixed(1);
    return value > 0 ? `+${absEval}` : `${absEval}`;
  };
  
  const difficultyColors = {
    easy: "bg-green-500/20 text-green-700 dark:text-green-400",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    hard: "bg-red-500/20 text-red-700 dark:text-red-400",
  };

  const renderBoard = () => {
    const chess = new Chess(fen);
    const board = chess.board();
    
    // Use proper Unicode symbols - white pieces (filled) vs black pieces (outlined)
    const pieceSymbols: { [key: string]: string } = {
      'p': '♟︎', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',  // Black pieces
      'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'   // White pieces
    };

    return (
      <div className="grid grid-cols-8 gap-0 w-full max-w-[320px] mx-auto border-2 border-border rounded-lg overflow-hidden shadow-lg">
        {board.map((row, i) =>
          row.map((square, j) => {
            const isLight = (i + j) % 2 === 0;
            const isWhitePiece = square && square.color === 'w';
            const piece = square ? pieceSymbols[square.type] : null;
            
            return (
              <div
                key={`${i}-${j}`}
                className={`aspect-square flex items-center justify-center text-4xl font-bold ${
                  isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
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
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tactic #{index + 1}</CardTitle>
          <div className="flex gap-2">
            <Badge className={difficultyColors[difficulty]}>
              {difficulty}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {formatEvaluation(evaluation)}
            </Badge>
          </div>
        </div>
        <CardDescription>Find the best move</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="play">Play {solved && "✓"}</TabsTrigger>
          </TabsList>
          <TabsContent value="view" className="space-y-4">
            {renderBoard()}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show solution
              </summary>
              <div className="mt-2 space-y-1">
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  {solution.join(' → ')}
                </p>
                <a
                  href={gameUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  View full game ↗
                </a>
              </div>
            </details>
          </TabsContent>
          <TabsContent value="play">
            <InteractiveBoard
              initialFen={fen}
              solution={solution}
              onCorrect={() => setSolved(true)}
              onWrong={() => setAttempts(attempts + 1)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
