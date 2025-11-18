import { Chess } from 'chess.js';
import { findBestLine } from './search';
import { analyzeTacticalPosition } from './tacticalPatterns';

export interface Tactic {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  evaluation: number;
}

export const generateTactics = (games: any[]): Tactic[] => {
  const tactics: Tactic[] = [];
  const seenPositions = new Set<string>();
  
  console.log('Starting tactics generation from', games.length, 'games');
  
  games.forEach((game, gameIndex) => {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      
      const history = chess.history({ verbose: true });
      console.log(`Game ${gameIndex + 1}: Analyzing ${history.length} moves`);
      
      // Only analyze positions after the opening (move 10+)
      for (let i = 10; i < history.length - 4; i++) {
        chess.reset();
        
        // Replay to the position BEFORE the tactical move
        for (let j = 0; j < i; j++) {
          chess.move(history[j]);
        }
        
        const fenBefore = chess.fen();
        
        // Skip if we've seen this position
        if (seenPositions.has(fenBefore)) continue;
        
        const actualMove = history[i];
        
        // Find the best continuation with deep search (12 ply for high quality)
        const bestContinuation = findBestLine(new Chess(fenBefore), 12);
        
        // Check if the actual move matches or is close to the engine's top choice
        const engineTopMove = bestContinuation.moves[0];
        
        if (!engineTopMove || engineTopMove.san !== actualMove.san) {
          // Skip if the actual move doesn't match engine recommendation
          continue;
        }
        
        // Analyze if this is truly a tactical position
        const tacticalInfo = analyzeTacticalPosition(
          new Chess(fenBefore), 
          actualMove,
          bestContinuation.moves.slice(1, 4)
        );
        
        // Only accept high-quality tactics with significant evaluation swing
        if (tacticalInfo.isTactical && tacticalInfo.evalSwing > 300) {
          const solution: string[] = [];
          const solutionChess = new Chess(fenBefore);

          // Build the solution from the engine's best line
          for (let k = 0; k < Math.min(5, bestContinuation.moves.length); k++) {
            const move = bestContinuation.moves[k];
            if (move) {
              try {
                solutionChess.move(move);
                solution.push(move.san);
              } catch {
                break;
              }
            }
          }

          // Only include if solution is at least 2 moves
          if (solution.length >= 2) {
            const evaluation = tacticalInfo.evalSwing;

            tactics.push({
              fen: fenBefore,
              solution: solution.slice(0, 5),
              difficulty: tacticalInfo.difficulty,
              gameUrl: game.url,
              evaluation: evaluation
            });

            seenPositions.add(fenBefore);
            
            console.log(`Found tactic: ${solution[0]} (${tacticalInfo.difficulty}, eval: ${evaluation.toFixed(0)})`);

            // Limit tactics per game to avoid similar positions
            if (tactics.length >= 20) break;
          }
        }
      }
      
      if (tactics.length >= 20) return;
    } catch (error) {
      console.error('Error processing game:', error);
    }
  });
  
  console.log(`Generated ${tactics.length} total tactics`);
  
  // Sort by evaluation swing (best tactics first) and limit to top 10
  tactics.sort((a, b) => b.evaluation - a.evaluation);
  
  // Ensure variety in difficulty
  const finalTactics: Tactic[] = [];
  const difficultyCount = { easy: 0, medium: 0, hard: 0 };
  const maxPerDifficulty = { easy: 4, medium: 4, hard: 4 };
  
  for (const tactic of tactics) {
    if (difficultyCount[tactic.difficulty] < maxPerDifficulty[tactic.difficulty]) {
      finalTactics.push(tactic);
      difficultyCount[tactic.difficulty]++;
      
      if (finalTactics.length >= 10) break;
    }
  }
  
  console.log('Final tactics:', finalTactics.length, 'Distribution:', difficultyCount);
  
  return finalTactics;
};
