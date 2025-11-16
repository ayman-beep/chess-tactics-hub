import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChessFormProps {
  onSubmit: (username: string, platform: "chess.com" | "lichess", gameCount: number) => void;
  isLoading: boolean;
}

export const ChessForm = ({ onSubmit, isLoading }: ChessFormProps) => {
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<"chess.com" | "lichess">("chess.com");
  const [gameCount, setGameCount] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim(), platform, gameCount);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Chess Tactics Generator</CardTitle>
        <CardDescription>
          Analyze your games and generate personalized tactics puzzles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Platform</Label>
            <RadioGroup value={platform} onValueChange={(value: "chess.com" | "lichess") => setPlatform(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="chess.com" id="chess-com" />
                <Label htmlFor="chess-com" className="font-normal cursor-pointer">
                  Chess.com
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lichess" id="lichess" />
                <Label htmlFor="lichess" className="font-normal cursor-pointer">
                  Lichess.org
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-count">Number of Games ({gameCount})</Label>
            <input
              type="range"
              id="game-count"
              min="1"
              max="20"
              value={gameCount}
              onChange={(e) => setGameCount(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !username.trim()}>
            {isLoading ? "Analyzing..." : "Generate Tactics"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
