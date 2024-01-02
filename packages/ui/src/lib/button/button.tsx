import clsx from 'clsx';

import styles from './button.module.scss';
import { ReactTagProps } from '../types';

export type ButtonProps = ReactTagProps<'button'>;

export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        styles['Button'],
        className,
        'inline-block outline-none px-3 py-1 border-b-4 active:border-b-2 active:border-t-2 rounded-md transition-colors duration-200',
        'bg-yellow-400 border-t-[transparent] bg-clip-padding border-b-yellow-500 hover:bg-yellow-300'
      )}
    >
      <span>{children}</span>
    </button>
  );
}
