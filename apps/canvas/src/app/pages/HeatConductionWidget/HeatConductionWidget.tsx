import { useEffect, useRef, useState } from 'react';

import { Button } from '@front-experiments/ui/components/ui/button';
import { Container } from '@front-experiments/ui/components/ui/Container';

import { HeatConduction2DPlayer } from './HeatConduction2DPlayer';

const width = 1200;
const height = 600;
const numSteps = 20;
const dr = 1;
const a = 0.5;
const maxTemp = 6000;

export const HeatConductionWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationPlayer = useRef<HeatConduction2DPlayer | null>(null);

  const [isRunning, setIsRunning] = useState(false);

  const [performanceData, setPerformanceData] = useState<{
    fps: number;
    deltaTime: number;
  }>({ fps: 0, deltaTime: 0 });

  const startSimulation = async () => {
    setIsRunning(true);
    simulationPlayer.current?.play(numSteps, setPerformanceData);
  };

  const pauseSimulation = () => {
    setIsRunning(false);
    simulationPlayer.current?.pause();
  };

  const resetSimulation = async () => {
    setIsRunning(false);
    simulationPlayer.current?.reset();
  };

  useEffect(() => {
    async function init() {
      const canvas = canvasRef.current;
      if (canvas === null) {
        return;
      }

      simulationPlayer.current = new HeatConduction2DPlayer(
        canvas,
        width,
        height,
        dr,
        a,
        maxTemp,
      );

      await simulationPlayer.current.reset();
    }

    init();

    return () => {
      simulationPlayer.current?.pause();
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
