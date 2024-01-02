import clsx from 'clsx';
import classes from './event-loop.module.scss';

export type EventLoopViewProps = {
  isActive: boolean;
};

export const EventLoopView = (props: EventLoopViewProps) => {
  return (
    <div className={classes.circle}>
      <div
        className={clsx(classes.border, props.isActive && classes.rotating)}
      />
      <div
        className={clsx(
          classes.content,
          'border-4 bg-yellow-400 border-yellow-500 rounded-[50%] flex justify-center items-center'
        )}
      >
        <p>Event Loop</p>
      </div>
    </div>
  );
};
