import { useEffect, useRef, useState } from 'react';

import { Button } from '@front-experiments/ui/components/ui/button';
import { Container } from '@front-experiments/ui/components/ui/Container';

import { HeatConduction2D } from './HeadConduction2D';

const width = 1200;
const height = 600;
const numSteps = 20;
const dr = 1;
const a = 0.5;
const maxTemp = 6000;

export const HeatConductionWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<GPUCanvasContext | null>(null);

  const simulation = useRef<HeatConduction2D | null>(null);

  const simulationState = useRef<{ isRunning: boolean }>({ isRunning: false });
  const [isRunning, setIsRunning] = useState(false);

  const [performanceData, setPerformanceData] = useState<{
    fps: number;
    deltaTime: number;
  }>({ fps: 0, deltaTime: 0 });

  const startSimulation = async () => {
    simulationState.current.isRunning = true;
    setIsRunning(true);

    let lastTime = performance.now();

    async function update() {
      try {
        const now = performance.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        setPerformanceData({ fps: 1000 / deltaTime, deltaTime });

        await simulation.current?.runSimulation(numSteps);
        simulation.current?.render();

        if (simulationState.current.isRunning) {
          requestAnimationFrame(update);
        }
      } catch (error) {
        console.error('An error occurred:', error);
      }
    }

    requestAnimationFrame(update);
  };

  const pauseSimulation = () => {
    simulationState.current.isRunning = false;
    setIsRunning(false);
  };

  const resetSimulation = async () => {
    simulationState.current.isRunning = false;
    setIsRunning(false);

    simulation.current = new HeatConduction2D(
      ctxRef.current!,
      width,
      height,
      dr,
      a,
      maxTemp,
    );
    await simulation.current.init();

    await simulation.current.runSimulation(1);
    simulation.current.render();
  };

  useEffect(() => {
    async function init() {
      const canvas = canvasRef.current;
      if (canvas === null) {
        return;
      }
      const ctx = canvas.getContext('webgpu');
      if (ctx === null) {
        return;
      }
      ctxRef.current = ctx;

      simulation.current = new HeatConduction2D(
        ctxRef.current!,
        width,
        height,
        dr,
        a,
        maxTemp,
      );
      await simulation.current.init();

      await simulation.current.runSimulation(1);
      simulation.current.render();
    }

    init();

    return () => {
      simulationState.current.isRunning = false;
    };
  }, [canvasRef]);

  return (
    <Container className="py-4 flex flex-col justify-center items-center">
      <div>
        <p className="m-2">
          Heat Conduction: A = {a}, DR (DX, DY) = {dr}, MAX_TEMP = {maxTemp}
        </p>

        <p className="m-2">
          FPS: {performanceData.fps.toFixed(2)}, Frame Time:{' '}
          {performanceData.deltaTime.toFixed(2)} ms
        </p>
      </div>

      <div className="m-2 rounded-lg overflow-hidden border-[1px] border-slate-400">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-w-full"
        ></canvas>
      </div>

      <div className="m-2 flex gap-2">
        <Button className="flex-1" onClick={resetSimulation}>
          Reset
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (isRunning) {
              pauseSimulation();
            } else {
              startSimulation();
            }
          }}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>
      </div>
    </Container>
  );
};
