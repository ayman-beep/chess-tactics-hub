import { useState } from "react";
import { ChessForm } from "@/components/ChessForm";
import { TacticCard } from "@/components/TacticCard";
import { fetchChessComGames, fetchLichessGames } from "@/lib/chessApi";
import { generateTactics, Tactic } from "@/lib/tacticsGenerator";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (username: string, platform: "chess.com" | "lichess", gameCount: number) => {
    setIsLoading(true);
    setTactics([]);

    try {
      toast({
        title: "Fetching games...",
        description: `Loading ${gameCount} games from ${platform}`,
      });

      console.log('Starting to fetch games for:', username, platform, gameCount);

      const games = platform === "chess.com"
        ? await fetchChessComGames(username, gameCount)
        : await fetchLichessGames(username, gameCount);

      console.log('Fetched games:', games.length);

      if (games.length === 0) {
        toast({
          title: "No games found",
          description: "Could not find any recent games for this user.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Analyzing positions...",
        description: "Generating tactical puzzles from your games",
      });

      const generatedTactics = generateTactics(games);

      console.log('Generated tactics:', generatedTactics.length);

      if (generatedTactics.length === 0) {
        toast({
          title: "No tactics found",
          description: "Could not find tactical positions in these games.",
          variant: "destructive",
        });
      } else {
        setTactics(generatedTactics);
        toast({
          title: "Success!",
          description: `Generated ${generatedTactics.length} tactical puzzles`,
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            ♟️ Chess Tactics Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Improve your chess by analyzing your own games
          </p>
        </div>

        <div className="flex justify-center">
          <ChessForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {tactics.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center">
              Your Tactics Puzzles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tactics.map((tactic, index) => (
                <TacticCard key={index} {...tactic} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
