import { useEffect } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Executor } from './Executor';

import { Button } from '@front-experiments/ui';
import { StackView } from './components/StackView';
import { QueueView } from './components/QueueView/QueueView';
import { EventLoopView } from './components/EventLoopView';

const state = new Executor();

export const App = observer(() => {
  useEffect(() => {
    state.startProcessing();
  }, []);

  return (
    <div className="min-h-[100vh] flex justify-center items-center">
      <div className={'m-auto w-full max-w-6xl p-6'}>
        <h1 className="text-center text-4xl leading-[3]">
          Event Loop Animation
        </h1>

        <div className="grid gap-4 grid-cols-3">
          <StackView
            name="Call Stack"
            elements={state.callStack}
            className={clsx(
              'h-[700px]',
              state.whatIsProcessing === 'CallStack' && 'border-green-400'
            )}
          />

          <div className="h-full flex flex-col justify-center items-center gap-4">
            <div className="mb-auto"></div>

            <EventLoopView isActive={state.isEventLoopActive} />

            <div className="mt-auto flex gap-2">
              <Button
                onClick={() => {
                  state.addCallStackTasks();
                  state.addOtherTasks();
                }}
              >
                Add any tasks
              </Button>
              <Button onClick={state.addCallStackTasks}>Add to Stack</Button>
              <Button onClick={state.addOtherTasks}>Add to queues</Button>
              <Button onClick={state.clear}>Clear</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <QueueView
              name="Microtasks Queue"
              description="Promise.then, queueMicrotask, mutationObserver"
              elements={state.microtaskQueue}
              className={clsx(
                'min-h-[200px] flex-1',
                state.whatIsProcessing === 'Microtask' && 'border-green-400'
              )}
            />
            <QueueView
              name="Callback (Task, Macrotask) Queue"
              description="setTimeout, setInterval, eventListener"
              elements={state.taskQueue}
              className={clsx(
                'min-h-[200px] flex-1',
                state.whatIsProcessing === 'Task' && 'border-green-400'
              )}
            />
            <QueueView
              name="RAF Callback Queue"
              description="requestAnimationFrame"
              elements={state.rafCallbackQueue}
              className={clsx(
                'min-h-[200px]',
                state.whatIsProcessing === 'RAFCallback' && 'border-green-400'
              )}
            />
          </div>
        </div>

        <div className="my-8">
          <QueueView
            name="Executed"
            elements={state.executedReversed}
            className="min-h-[150px]"
            containerClassName="flex-row-reverse"
          />
        </div>
      </div>
    </div>
  );
});
