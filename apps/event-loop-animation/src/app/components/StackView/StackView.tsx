import { ReactNode } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { AnyTask } from '../../Executor';

import { AnimatePresence, motion } from 'framer-motion';
import { Panel } from '@front-experiments/ui';

export type StackViewProps = {
  name: ReactNode;
  elements: AnyTask[];
  className?: string;
};

export const StackView = observer((props: StackViewProps) => {
  return (
    <Panel className={clsx(props.className, 'pb-4 pt-2 flex flex-col')}>
      <p className="text-2xl font-bold text-[rgba(0,0,0,0.5)]">{props.name}</p>

      <div className="mt-2 pr-2 flex-1 flex flex-col-reverse justify-start items-stretch gap-2 overflow-auto custom-scroll-bar">
        <AnimatePresence>
          {props.elements.map((task) => (
            <motion.div
              key={task.key}
              className={clsx(
                'min-h-[50px] flex-shrink-0 flex-grow-0 border-2 rounded-lg p-2 bg-amber-200 border-amber-400 overflow-hidden',
                task.status === 'Running' && 'border-green-400'
              )}
              initial={{
                translateY: '-50%',
                opacity: 0,
              }}
              animate={{
                translateY: '0%',
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                translateY: '-50%',
              }}
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
