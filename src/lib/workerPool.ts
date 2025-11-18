export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    fen: string;
    depth: number;
    resolve: (result: any) => void;
    reject: (error: any) => void;
    id: number;
  }> = [];
  private nextTaskId = 0;
  private pendingTasks = new Map<number, {
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }>();

  constructor(poolSize?: number) {
    // Use number of CPU cores or default to 8
    const workerCount = poolSize || navigator.hardwareConcurrency || 8;
    
    console.log(`Initializing ${workerCount} chess analysis workers`);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL('./chessWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        
        if (type === 'result') {
          const pending = this.pendingTasks.get(data.id);
          if (pending) {
            pending.resolve(data);
            this.pendingTasks.delete(data.id);
          }
          
          this.availableWorkers.push(worker);
          this.processQueue();
        } else if (type === 'error') {
          const pending = this.pendingTasks.get(data.id);
          if (pending) {
            pending.reject(new Error(data.error));
            this.pendingTasks.delete(data.id);
          }
          
          this.availableWorkers.push(worker);
          this.processQueue();
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.availableWorkers.push(worker);
        this.processQueue();
      };
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;
      
      this.pendingTasks.set(task.id, {
        resolve: task.resolve,
        reject: task.reject
      });
      
      worker.postMessage({
        type: 'analyze',
        data: {
          fen: task.fen,
          depth: task.depth,
          id: task.id
        }
      });
    }
  }

  public analyze(fen: string, depth: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextTaskId++;
      
      this.taskQueue.push({
        fen,
        depth,
        resolve,
        reject,
        id
      });
      
      this.processQueue();
    });
  }

  public clearCache(): void {
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'clear-cache' });
    });
  }

  public terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
  }

  public getStatus() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      runningTasks: this.pendingTasks.size
    };
  }
}

// Singleton instance
let globalWorkerPool: WorkerPool | null = null;

export const getWorkerPool = (): WorkerPool => {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool();
  }
  return globalWorkerPool;
};

export const terminateWorkerPool = (): void => {
  if (globalWorkerPool) {
    globalWorkerPool.terminate();
    globalWorkerPool = null;
  }
};
