import { Chess } from 'chess.js';
import { getWorkerPool } from './workerPool';
import { analyzeTacticalPosition } from './tacticalPatterns';

export interface Tactic {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  evaluation: number;
}

export const generateTactics = async (games: any[], onProgress?: (progress: number, status: string) => void): Promise<Tactic[]> => {
  const tactics: Tactic[] = [];
  const seenPositions = new Set<string>();
  const workerPool = getWorkerPool();
  
  console.log('Starting parallel tactics generation from', games.length, 'games');
  console.log('Worker pool status:', workerPool.getStatus());
  
  if (onProgress) onProgress(0, 'Initializing parallel analysis...');
  
  // Collect all positions to analyze
  const positionsToAnalyze: Array<{
    fenBefore: string;
    actualMove: any;
    gameUrl: string;
    gameIndex: number;
    moveIndex: number;
  }> = [];
  
  games.forEach((game, gameIndex) => {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      
      const history = chess.history({ verbose: true });
      
      for (let i = 10; i < history.length - 4; i++) {
        chess.reset();
        
        for (let j = 0; j < i; j++) {
          chess.move(history[j]);
        }
        
        const fenBefore = chess.fen();
        
        if (!seenPositions.has(fenBefore)) {
          positionsToAnalyze.push({
            fenBefore,
            actualMove: history[i],
            gameUrl: game.url,
            gameIndex,
            moveIndex: i
          });
          seenPositions.add(fenBefore);
        }
      }
    } catch (error) {
      console.error('Error processing game:', error);
    }
  });
  
  console.log(`Found ${positionsToAnalyze.length} unique positions to analyze in parallel`);
  
  if (onProgress) onProgress(5, `Analyzing ${positionsToAnalyze.length} positions with ${workerPool.getStatus().totalWorkers} CPU cores...`);
  
  // Analyze all positions in parallel using worker pool
  const analysisPromises = positionsToAnalyze.map(async (pos, index) => {
    try {
      const result = await workerPool.analyze(pos.fenBefore, 12);
      
      if (onProgress && index % 10 === 0) {
        const progress = 5 + (index / positionsToAnalyze.length) * 85;
        onProgress(progress, `Analyzed ${index}/${positionsToAnalyze.length} positions...`);
      }
      
      return {
        ...pos,
        bestContinuation: result
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  });
  
  const analysisResults = await Promise.all(analysisPromises);
  
  if (onProgress) onProgress(90, 'Filtering high-quality tactics...');
  
  // Process results and extract tactics
  for (const result of analysisResults) {
    if (!result || !result.bestContinuation) continue;
    
    const { fenBefore, actualMove, gameUrl, bestContinuation } = result;
    
    const engineTopMove = bestContinuation.moves[0];
    
    if (!engineTopMove || engineTopMove.san !== actualMove.san) {
      continue;
    }
    
    const tacticalInfo = analyzeTacticalPosition(
      new Chess(fenBefore), 
      actualMove,
      bestContinuation.moves.slice(1, 4)
    );
    
    if (tacticalInfo.isTactical && tacticalInfo.evalSwing > 300) {
      const solution: string[] = [];
      const solutionChess = new Chess(fenBefore);

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

      if (solution.length >= 2) {
        tactics.push({
          fen: fenBefore,
          solution: solution.slice(0, 5),
          difficulty: tacticalInfo.difficulty,
          gameUrl: gameUrl,
          evaluation: tacticalInfo.evalSwing
        });
        
        if (tactics.length >= 20) break;
      }
    }
  }
  
  console.log(`Generated ${tactics.length} total tactics`);
  
  if (onProgress) onProgress(95, 'Sorting and finalizing...');
  
  tactics.sort((a, b) => b.evaluation - a.evaluation);
  
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
  
  if (onProgress) onProgress(100, `Complete! Found ${finalTactics.length} high-quality tactics`);
  
  console.log('Final tactics:', finalTactics.length, 'Distribution:', difficultyCount);
  
  return finalTactics;
};
