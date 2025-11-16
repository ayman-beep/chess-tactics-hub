import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chess } from "chess.js";

interface TacticCardProps {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  index: number;
}

export const TacticCard = ({ fen, solution, difficulty, gameUrl, index }: TacticCardProps) => {
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
                  <span className={isWhitePiece ? 'text-[#f0e9dc]' : 'text-[#1a1a1a]'} style={{
                    filter: isWhitePiece ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'drop-shadow(0 1px 2px rgba(255,255,255,0.2))'
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
      </CardContent>
    </Card>
  );
};
