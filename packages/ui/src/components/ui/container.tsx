import React from 'react';
import { cn } from '@front-experiments/ui/utils';

export type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export const Container = (props: ContainerProps) => {
  return (
    <div className={cn('max-w-5xl mx-auto', props.className)}>
      {props.children}
    </div>
  );
};
