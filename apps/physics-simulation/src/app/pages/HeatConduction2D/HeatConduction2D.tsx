import { useEffect, useRef, useState } from 'react';

import { Button, Panel } from '@front-experiments/ui';
import {
  DR,
  MAX_TEMP,
  getStartingState,
  updateState,
} from './heatConductionSim';

export const HeatConduction2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let state = getStartingState(canvas.width, canvas.height);
    let nextState = getStartingState(canvas.width, canvas.height);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < state.length; y++) {
        for (let x = 0; x < state[y].length; x++) {
          const brightness = (state[y][x] / MAX_TEMP) * 255;

          ctx.fillStyle = `rgb(${brightness}, ${brightness / 3}, ${
            255 - brightness
          })`;
          ctx.fillRect(x * DR, y * DR, DR, DR);
        }
      }
    };

    const intervalId = setInterval(() => {
      draw();
      for (let i = 0; i < 100; i++) {
        updateState(state, nextState);

        const tmp = state;
        state = nextState;
        nextState = tmp;
      }
    }, 10) as unknown as number;
    setIntervalId(intervalId);

    return () => {
      clearInterval(intervalId);
    };
  }, [canvasRef]);

  const onStart = () => {
    console.log('start');
  };

  const onStop = () => {
    console.log('stop');
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };

  return (
    <div>
      <div>
        <Button onClick={onStart}>Start</Button>
        <Button onClick={onStop}>Stop</Button>
      </div>

      <Panel className="m-2 overflow-hidden p-0 inline-block">
        <canvas ref={canvasRef} width={300} height={300}></canvas>
      </Panel>
    </div>
  );
};
