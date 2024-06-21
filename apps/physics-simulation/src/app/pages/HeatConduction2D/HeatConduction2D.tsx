import { useEffect, useRef } from 'react';

import { Panel } from '@front-experiments/ui';
import {
  DR,
  MAX_TEMP,
  getStartingState,
  updateState,
} from './heatConductionSim';

const countTime = (name: string, cb: () => void) => {
  const start = performance.now();
  cb();
  console.log(`[${name}] elapsed: ${performance.now() - start}`);
};

export const HeatConduction2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }

    let state = getStartingState(canvas.width, canvas.height);
    let nextState = getStartingState(canvas.width, canvas.height);

    const brightnessPerTemp = 255 / MAX_TEMP;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < state.length; y++) {
        const yDR = y * DR;
        for (let x = 0; x < state[y].length; x++) {
          const brightness = state[y][x] * brightnessPerTemp;

          ctx.fillStyle = `rgb(${brightness}, ${brightness / 3}, ${
            255 - brightness
          })`;
          ctx.fillRect(x * DR, yDR, DR, DR);
        }
      }
    };
    draw();

    const update = () => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;
      console.log(`deltaTime: ${deltaTime}, fps: ${1000 / deltaTime}`);

      countTime('update', () => {
        for (let i = 0; i < 10; i++) {
          updateState(state, nextState, 0.1);

          [state, nextState] = [nextState, state];
        }
      });

      countTime('draw', () => draw());

      if (isRunning) {
        requestAnimationFrame(update);
      }
    };

    let isRunning = true;
    let lastTime = performance.now();
    requestAnimationFrame(update);

    return () => {
      isRunning = false;
    };
  }, [canvasRef]);

  return (
    <div>
      <Panel className="m-2 overflow-hidden p-0 inline-block">
        <canvas ref={canvasRef} width={300} height={300}></canvas>
      </Panel>
    </div>
  );
};
