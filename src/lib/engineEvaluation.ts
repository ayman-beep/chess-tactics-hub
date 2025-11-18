import { Chess } from 'chess.js';

let engineInstance: any = null;

const initializeEngine = async () => {
  if (engineInstance) return engineInstance;

  try {
    const StockfishModule = await import('stockfish');
    const Stockfish = StockfishModule.default;
    engineInstance = Stockfish();

    return new Promise((resolve) => {
      engineInstance.onmessage = (event: any) => {
        if (event.data && typeof event.data === 'string' && event.data.includes('uciok')) {
          resolve(engineInstance);
        }
      };
      engineInstance.postMessage('uci');
    });
  } catch (error) {
    console.error('Failed to initialize Stockfish:', error);
    throw error;
  }
};

export const evaluatePosition = async (fen: string, depth: number = 15): Promise<number> => {
  try {
    const engine = await initializeEngine();

    return new Promise((resolve) => {
      let bestScore = 0;

      const handleMessage = (event: any) => {
        const data = event.data;

        if (typeof data === 'string') {
          if (data.includes('bestmove')) {
            engine.onmessage = null;
            resolve(bestScore);
          } else if (data.includes('info') && data.includes('score')) {
            const scoreMatch = data.match(/score cp (-?\d+)/);
            if (scoreMatch) {
              bestScore = parseInt(scoreMatch[1]) / 100;
            }
          }
        }
      };

      engine.onmessage = handleMessage;
      engine.postMessage('position fen ' + fen);
      engine.postMessage(`go depth ${depth}`);
    });
  } catch (error) {
    console.error('Engine evaluation error:', error);
    return 0;
  }
};

export const findBestMove = async (fen: string, depth: number = 15): Promise<string | null> => {
  try {
    const engine = await initializeEngine();

    return new Promise((resolve) => {
      let bestMove: string | null = null;

      const handleMessage = (event: any) => {
        const data = event.data;

        if (typeof data === 'string') {
          if (data.includes('bestmove')) {
            const match = data.match(/bestmove (\S+)/);
            bestMove = match ? match[1] : null;
            engine.onmessage = null;
            resolve(bestMove);
          }
        }
      };

      engine.onmessage = handleMessage;
      engine.postMessage('position fen ' + fen);
      engine.postMessage(`go depth ${depth}`);
    });
  } catch (error) {
    console.error('Best move search error:', error);
    return null;
  }
};
