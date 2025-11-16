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
}

export const TacticCard = ({ fen, solution, difficulty, gameUrl, index }: TacticCardProps) => {
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  
  const difficultyColors = {
    easy: "bg-green-500/20 text-green-700 dark:text-green-400",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    hard: "bg-red-500/20 text-red-700 dark:text-red-400",
  };

  const renderBoard = () => {
    const chess = new Chess(fen);
    const board = chess.board();
    const pieceSymbols: { [key: string]: string } = {
      'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
      'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
    };

    return (
      <div className="grid grid-cols-8 gap-0 w-full max-w-[320px] mx-auto border-2 border-border rounded-lg overflow-hidden">
        {board.map((row, i) =>
          row.map((square, j) => {
            const isLight = (i + j) % 2 === 0;
            const piece = square ? pieceSymbols[square.type === square.type.toLowerCase() ? square.type : square.type.toUpperCase()] : null;
            const isWhitePiece = square && square.color === 'w';
            
            return (
              <div
                key={`${i}-${j}`}
                className={`aspect-square flex items-center justify-center text-4xl ${
                  isLight ? 'bg-secondary' : 'bg-accent'
                }`}
              >
                {piece && (
                  <span className={isWhitePiece ? 'text-white' : 'text-black'} style={{
                    filter: isWhitePiece 
                      ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))' 
                      : 'drop-shadow(0 2px 3px rgba(255,255,255,0.5))'
                  }}>
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
          <Badge className={difficultyColors[difficulty]}>
            {difficulty}
          </Badge>
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
