import { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './button.module.scss';

export interface ButtonProps {
  children: ReactNode;
  className?: string;
}

export function Button(props: ButtonProps) {
  return (
    <button
      className={clsx(
        styles['Button'],
        props.className,
        'p-1 border-2 rounded-sm bg-slate-700 text-white'
      )}
    >
      <span>{props.children}</span>
    </button>
  );
}
