import { ReactNode } from 'react';
import clsx from 'clsx';

import { observer } from 'mobx-react-lite';

import { AnyTask } from '../../Executor';

import { AnimatePresence, motion } from 'framer-motion';
import { Panel } from '@front-experiments/ui';

export type QueueViewProps = {
  name: ReactNode;
  className?: string;
  containerClassName?: string;
  elementClassName?: string;
  elements: AnyTask[];
  description?: ReactNode;
};

export const QueueView = observer((props: QueueViewProps) => {
  return (
    <Panel className={clsx(props.className, 'py-2')}>
      <p className="text-2xl font-bold text-[rgba(0,0,0,0.5)]">{props.name}</p>

      <div>{props.description}</div>

      <div
        className={clsx(
          'mt-2 flex flex-row gap-2 pb-2 overflow-auto custom-scroll-bar',
          props.containerClassName
        )}
      >
        <AnimatePresence>
          {props.elements.map((task) => (
            <motion.div
              key={task.key}
              className={clsx(
                'flex-grow-0 flex-shrink-0 min-w-[70px] max-w-[200px] w-[min-content] border-2 rounded-lg p-2 bg-amber-200 border-amber-400 overflow-hidden',
                props.elementClassName
              )}
              initial={{
                translateX: '50%',
                opacity: 0,
              }}
              animate={{
                translateX: '0%',
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                translateX: '-50%',
              }}
              layout
            >
              <div>{task.node}</div>
              <div>type: {task.type}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
});
