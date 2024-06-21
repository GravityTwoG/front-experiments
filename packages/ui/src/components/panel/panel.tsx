import clsx from 'clsx';
import { ReactNode } from 'react';

export type PanelProps = {
  className?: string;
  children?: ReactNode;
};

export const Panel = (props: PanelProps) => {
  return (
    <div
      {...props}
      className={clsx(
        props.className,
        'border-4 rounded-lg p-4 bg-amber-300 border-amber-400'
      )}
    />
  );
};
