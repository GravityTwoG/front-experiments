import { useEffect, useRef } from 'react';

import { HeatConduction2D } from './headConduction2D';

const width = 300;
const height = 300;
const numSteps = 10;

export const HeatConductionWidget = () => {
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

    let isRunning = true;

    async function start() {
      const simulation = new HeatConduction2D(width, height);
      await simulation.init();

      let lastTime = performance.now();

      async function update() {
        try {
          const now = performance.now();
          const deltaTime = now - lastTime;
          lastTime = now;
          console.log(`deltaTime: ${deltaTime}, fps: ${1000 / deltaTime}`);

          const result = await simulation.runSimulation(numSteps);

          simulation.renderHeatMap(result!, ctx!);

          if (isRunning) {
            requestAnimationFrame(update);
          }
        } catch (error) {
          console.error('An error occurred:', error);
        }
      }

      requestAnimationFrame(update);
    }

    start();

    return () => {
      isRunning = false;
    };
  }, [canvasRef]);

  return (
    <div className="max-w-5xl mx-auto flex justify-center">
      <div className="m-2 rounded-lg overflow-hidden border-[1px] border-slate-400">
        <canvas ref={canvasRef} width={300} height={300}></canvas>
      </div>
    </div>
  );
};
