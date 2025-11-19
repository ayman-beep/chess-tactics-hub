import { Chess } from 'chess.js';
import { analyzeTacticalPosition } from './tacticalPatterns';
import { getWorkerPool } from './workerPool';

export interface Tactic {
  fen: string;
  solution: string[];
  difficulty: "easy" | "medium" | "hard";
  gameUrl: string;
  evaluation: number;
}

export const generateTactics = async (
  games: any[],
  onProgress?: (progress: number, status: string) => void
): Promise<Tactic[]> => {
  const tactics: Tactic[] = [];
  const seenPositions = new Set<string>();
  const workerPool = getWorkerPool();

  console.log('Starting parallel tactics generation from', games.length, 'games');
  console.log('Worker pool:', workerPool.getStatus());

  // Collect all positions to analyze
  const positionsToAnalyze: Array<{
    fenBefore: string;
    actualMove: any;
    gameUrl: string;
    gameIndex: number;
    moveIndex: number;
  }> = [];

  let totalMoves = 0;

  games.forEach((game, gameIndex) => {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);

      const history = chess.history({ verbose: true });
      totalMoves += history.length;

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

  console.log(`Found ${positionsToAnalyze.length} unique positions to analyze`);

  if (onProgress) {
    onProgress(5, `Found ${positionsToAnalyze.length} positions. Analyzing with ${workerPool.getStatus().totalWorkers} CPU cores...`);
  }

  // Analyze all positions in parallel using worker pool
  const analysisResults: any[] = [];
  const analysisPromises: Promise<any>[] = [];

  positionsToAnalyze.forEach((pos, index) => {
    const promise = workerPool.analyze(pos.fenBefore, 4).then(result => {
      const progress = 5 + ((index + 1) / positionsToAnalyze.length) * 80;
      const gamePercent = ((pos.moveIndex / (totalMoves / games.length)) * 100).toFixed(1);

      if (onProgress) {
        onProgress(
          progress,
          `Analyzed ${index + 1}/${positionsToAnalyze.length} positions (Game ${pos.gameIndex + 1}: ${gamePercent}% done)`
        );
      }

      return {
        ...pos,
        bestContinuation: result
      };
    }).catch(error => {
      console.error(`Analysis error at position ${index}:`, error);
      return null;
    });

    analysisPromises.push(promise);
  });

  // Wait for all analyses to complete
  const results = await Promise.all(analysisPromises);
  analysisResults.push(...results);

  if (onProgress) {
    onProgress(90, 'Filtering high-quality tactics...');
  }

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
          evaluation: tacticalInfo.evalSwing / 100
        });

        if (tactics.length >= 20) break;
      }
    }
  }

  console.log(`Generated ${tactics.length} total tactics`);

  if (onProgress) {
    onProgress(95, 'Finalizing...');
  }

  // Sort by evaluation and get best 10
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

  if (onProgress) {
    onProgress(100, `Complete! Found ${finalTactics.length} tactics`);
  }

  console.log('Final tactics:', finalTactics.length, 'Distribution:', difficultyCount);

  return finalTactics;
};
