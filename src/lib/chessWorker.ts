import { Chess } from 'chess.js';

let stockfish: Worker | null = null;
let analysisQueue: Map<string, {
  resolve: (result: any) => void;
  reject: (error: any) => void;
  depth: number;
}> = new Map();

let currentAnalysisId: string | null = null;
let bestMove: string = '';
let score: number = 0;
let pv: string[] = [];

// Initialize Stockfish from CDN
const initStockfish = async () => {
  if (stockfish) return;
  
  return new Promise<void>((resolve, reject) => {
    try {
      // Use Stockfish.js from CDN (official build)
      stockfish = new Worker('https://unpkg.com/stockfish.js@10.0.2/stockfish.js');
      
      let ready = false;
      
      stockfish.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        
        // Handle ready confirmation
        if (msg === 'readyok' && !ready) {
          ready = true;
          console.log('Stockfish initialized successfully');
          resolve();
        } else {
          handleStockfishMessage(msg);
        }
      };
      
      stockfish.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        reject(new Error('Failed to load Stockfish'));
      };
      
      // Initialize engine
      stockfish.postMessage('uci');
      stockfish.postMessage('setoption name Threads value 1');
      stockfish.postMessage('setoption name Hash value 64');
      stockfish.postMessage('isready');
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!ready) {
          reject(new Error('Stockfish initialization timeout'));
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      reject(error);
    }
  });
};

const handleStockfishMessage = (line: string) => {
  if (!currentAnalysisId) return;
  
  // Parse best move and score from UCI output
  if (line.includes('info') && line.includes('depth') && line.includes('score')) {
    const depthMatch = line.match(/depth (\d+)/);
    const scoreMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);
    const pvMatch = line.match(/pv (.+)/);
    
    if (depthMatch && (scoreMatch || mateMatch)) {
      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1]);
        score = mateIn > 0 ? 10000 - mateIn : -10000 - mateIn;
      } else if (scoreMatch) {
        score = parseInt(scoreMatch[1]);
      }
      
      if (pvMatch) {
        pv = pvMatch[1].trim().split(' ').slice(0, 8);
      }
    }
  }
  
  if (line.startsWith('bestmove')) {
    const moveMatch = line.match(/bestmove (\S+)/);
    if (moveMatch) {
      bestMove = moveMatch[1];
      completeAnalysis();
    }
  }
};

const completeAnalysis = () => {
  if (!currentAnalysisId) return;
  
  const analysis = analysisQueue.get(currentAnalysisId);
  if (analysis) {
    const chess = new Chess();
    const moves = pv.map(uciMove => {
      try {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        
        const move = chess.move({ from, to, promotion });
        return move;
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    analysis.resolve({
      moves,
      score,
      fen: '',
      nodesSearched: 0
    });
    
    analysisQueue.delete(currentAnalysisId);
    currentAnalysisId = null;
    bestMove = '';
    score = 0;
    pv = [];
    
    processNextAnalysis();
  }
};

const processNextAnalysis = () => {
  if (currentAnalysisId || analysisQueue.size === 0) return;
  
  const nextId = analysisQueue.keys().next().value;
  if (!nextId) return;
  
  const analysis = analysisQueue.get(nextId);
  if (!analysis) return;
  
  currentAnalysisId = nextId;
  const { depth } = analysis;
  
  // Extract FEN from the analysis ID (format: "fen_depth_randomid")
  const fenPart = nextId.split('_depth_')[0];
  
  stockfish.postMessage(`position fen ${fenPart}`);
  stockfish.postMessage(`go depth ${depth}`);
};

const analyzePosition = (fen: string, depth: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    const id = `${fen}_depth_${depth}_${Math.random()}`;
    analysisQueue.set(id, { resolve, reject, depth });
    
    if (!currentAnalysisId) {
      processNextAnalysis();
    }
  });
};

// Worker message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;
  
  if (type === 'analyze') {
    const { fen, depth, id } = data;
    
    try {
      await initStockfish();
      
      // Cap depth at 18 for reasonable performance
      const safeDepth = Math.min(Math.max(depth, 10), 18);
      
      const result = await analyzePosition(fen, safeDepth);
      
      self.postMessage({
        type: 'result',
        data: {
          id,
          moves: result.moves,
          score: result.score,
          fen,
          nodesSearched: 0
        }
      });
    } catch (error) {
      console.error('Worker analysis error:', error);
      self.postMessage({
        type: 'error',
        data: {
          id,
          error: error instanceof Error ? error.message : 'Analysis failed'
        }
      });
    }
  } else if (type === 'clear-cache') {
    analysisQueue.clear();
    currentAnalysisId = null;
  }
};
