import { useState } from "react";
import { ChessForm } from "@/components/ChessForm";
import { TacticCard } from "@/components/TacticCard";
import { fetchChessComGames, fetchLichessGames } from "@/lib/chessApi";
import { generateTactics, Tactic } from "@/lib/tacticsGenerator";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");
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
        description: "Starting multi-threaded analysis using all CPU cores",
      });

      const generatedTactics = await generateTactics(games, (progress, status) => {
        setAnalysisProgress(progress);
        setAnalysisStatus(status);
      });

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
          description: `Generated ${generatedTactics.length} tactical puzzles using parallel analysis`,
        });
      }
      
      setAnalysisProgress(0);
      setAnalysisStatus("");
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

        {isLoading && analysisProgress > 0 && (
          <div className="max-w-2xl mx-auto space-y-2 p-6 bg-card rounded-lg border">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{analysisStatus}</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Using {navigator.hardwareConcurrency || 8} CPU cores for parallel analysis
            </p>
          </div>
        )}

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
