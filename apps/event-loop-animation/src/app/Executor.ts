import { makeAutoObservable, runInAction } from 'mobx';
import { ReactNode } from 'react';

export type AsyncTaskType = 'Microtask' | 'Task' | 'RAFCallback';
export type AnyTaskType = AsyncTaskType | 'Sync task';

export type AnyTask = {
  key: number | string;
  node: ReactNode;
  type: AnyTaskType;
  status: 'Waiting' | 'Running' | 'Executed';
};

function generateTasks(amount: number, type: AnyTaskType): AnyTask[] {
  const tasks: AnyTask[] = [];

  for (let i = 0; i < amount; i++) {
    tasks.push({
      key: Math.random(),
      node: Math.random().toString(16),
      type: type,
      status: 'Waiting',
    });
  }

  return tasks;
}

export class Executor {
  readonly executed: AnyTask[] = [];
  readonly callStack: AnyTask[] = [];
  // Promise.then(callback), queueMicrotask(callback), mutationObserver(callback),
  readonly microtaskQueue: AnyTask[] = [];
  // setTimeout(callback), setInterval(callback), eventListeners (which called not by js),
  readonly taskQueue: AnyTask[] = [];
  // requestAnimationFrame(callback);
  readonly rafCallbackQueue: AnyTask[] = [];

  private schedule: (() => Promise<void>)[] = [];
  private isProcessing = false;

  private eventLoopRuns: AsyncTaskType = 'Microtask';
  private currentlyRunning: 'CallStack' | AsyncTaskType = 'CallStack';

  get isEventLoopActive() {
    return this.callStack.length === 0;
  }

  get whatIsProcessing() {
    return this.currentlyRunning;
  }

  get executedReversed() {
    const reversed = [];

    for (let i = this.executed.length - 1; i >= 0; i--) {
      reversed.push(this.executed[i]);
    }

    return reversed;
  }

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  public addCallStackTasks() {
    this.callStack.push(...generateTasks(5, 'Sync task'));
  }

  public addOtherTasks() {
    this.microtaskQueue.push(...generateTasks(5, 'Microtask'));
    this.taskQueue.push(...generateTasks(5, 'Task'));
    this.rafCallbackQueue.push(...generateTasks(5, 'RAFCallback'));
  }

  public async startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.schedule.push(this.startExecution);

    const process = async () => {
      if (this.schedule.length > 0) {
        await this.schedule.shift()!();
      }
      requestAnimationFrame(process);
    };

    requestAnimationFrame(process);
  }

  private async startExecution() {
    this.currentlyRunning = 'CallStack';

    this.startExecuting();

    await this.sleep(1000);

    runInAction(() => {
      if (this.callStack.length > 1) {
        const last = this.callStack[this.callStack.length - 1];
        last.status = 'Executed';
        this.executed.push(this.callStack.pop()!);
        this.schedule.push(this.startExecution);
      } else if (this.callStack.length === 1) {
        const last = this.callStack[this.callStack.length - 1];
        last.status = 'Executed';
        this.executed.push(this.callStack.pop()!);
        this.schedule.push(this.startEventLoop);
      } else {
        this.schedule.push(this.startEventLoop);
      }
    });
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startExecuting() {
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].status = 'Running';
    }
  }

  private async startEventLoop() {
    this.currentlyRunning = this.eventLoopRuns;
    await this.sleep(1000);

    if (this.callStack.length > 0) {
      this.schedule.push(this.startExecution);
      return;
    }

    runInAction(() => {
      switch (this.eventLoopRuns) {
        case 'Microtask': {
          if (this.microtaskQueue.length > 0) {
            this.callStack.push(this.microtaskQueue.shift()!);
            this.schedule.push(this.startExecution);
          } else {
            this.eventLoopRuns = 'Task';
            this.schedule.push(this.startEventLoop);
          }
          break;
        }
        case 'Task': {
          this.eventLoopRuns = 'RAFCallback';
          if (this.taskQueue.length > 0) {
            this.callStack.push(this.taskQueue.shift()!);
            this.schedule.push(this.startExecution);
          } else if (this.taskQueue.length === 0) {
            this.schedule.push(this.startEventLoop);
          }
          break;
        }
        case 'RAFCallback': {
          if (this.rafCallbackQueue.length > 0) {
            this.callStack.push(this.rafCallbackQueue.shift()!);
            this.schedule.push(this.startExecution);
          } else {
            this.eventLoopRuns = 'Microtask';
            this.schedule.push(this.startEventLoop);
          }
          break;
        }
      }
    });
  }

  public clear() {
    this.executed.splice(0, this.executed.length);
    this.callStack.splice(0, this.callStack.length);
    this.microtaskQueue.splice(0, this.microtaskQueue.length);
    this.taskQueue.splice(0, this.taskQueue.length);
    this.rafCallbackQueue.splice(0, this.rafCallbackQueue.length);
    this.eventLoopRuns = 'Microtask';
  }
}
