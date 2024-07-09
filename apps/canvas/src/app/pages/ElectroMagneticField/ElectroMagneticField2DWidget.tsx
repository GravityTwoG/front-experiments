import { useEffect, useRef, useState } from 'react';

import { Button } from '@front-experiments/ui/components/ui/button';
import { Container } from '@front-experiments/ui/components/ui/Container';

import { ElectroMagneticField2DPlayer } from './ElectroMagneticField2DPlayer';
import { Input } from '@front-experiments/ui/components/ui/input';
import { Label } from '@front-experiments/ui/components/ui/label';

const width = 1200;
const height = 900;
const numSteps = 100;
const dr = 0.5;

export const ElectroMagneticField2DWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationPlayer = useRef<ElectroMagneticField2DPlayer | null>(null);

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
    await Promise.resolve();
    setIsRunning(true);
    simulationPlayer.current?.play(numSteps, setPerformanceData);
  };

  useEffect(() => {
    async function init() {
      const canvas = canvasRef.current;
      if (canvas === null) {
        return;
      }

      simulationPlayer.current = new ElectroMagneticField2DPlayer(
        canvas,
        width,
        height,
        dr,
      );

      await simulationPlayer.current.reset();
      await simulationPlayer.current.play(numSteps, setPerformanceData);
      setIsRunning(true);
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
          Charged particles in electro magnetic field: DR (DX, DY) = {dr}, mass
          of particle: {simulationPlayer.current?.simulation.mass}
        </p>

        <p className="m-2">
          FPS: {performanceData.fps.toFixed(2)}, Frame Time:{' '}
          {performanceData.deltaTime.toFixed(2)} ms, Steps per frame: {numSteps}
        </p>
      </div>

      <div className="m-2 rounded-lg overflow-hidden border-[1px] border-slate-400">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-w-full"
          onClick={(event) => {
            if (isRunning) {
              const rect = canvasRef.current!.getBoundingClientRect();
              const x = (event.clientX - rect.left) / rect.width;
              const y = (event.clientY - rect.top) / rect.height;

              simulationPlayer.current?.simulation.addParticle(x, y);
            }
          }}
        ></canvas>
      </div>

      <div className="m-2 flex gap-2">
        <Button className="flex-1" onClick={resetSimulation}>
          Reset
        </Button>
        <Button
          className="flex-1"
          onClick={() => simulationPlayer.current?.simulation.removeParticles()}
        >
          Remove charges
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

      <div className="m-2 flex flex-wrap gap-2" key={isRunning.toString()}>
        <Label>
          <p className="mb-1">dt</p>
          <Input
            type="number"
            step="0.01"
            defaultValue={simulationPlayer.current?.simulation.dt ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const dt = e.target.valueAsNumber;
              if (dt > 0 && !isNaN(dt)) {
                simulationPlayer.current.simulation.dt = dt;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">Electric Field</p>
          <Input
            type="checkbox"
            defaultChecked={
              simulationPlayer.current?.simulation.electricFieldEnabled
            }
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }
              simulationPlayer.current.simulation.electricFieldEnabled =
                e.target.checked;
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">Magnetic Field</p>
          <Input
            type="checkbox"
            defaultChecked={
              simulationPlayer.current?.simulation.magneticFieldEnabled
            }
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }
              simulationPlayer.current.simulation.magneticFieldEnabled =
                e.target.checked;
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">B, Tsl</p>
          <Input
            type="number"
            step="0.0001"
            defaultValue={simulationPlayer.current?.simulation.B ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const B = e.target.valueAsNumber;
              if (!isNaN(B)) {
                simulationPlayer.current.simulation.B = B;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">E.x, V/m</p>
          <Input
            type="number"
            step="0.01"
            defaultValue={simulationPlayer.current?.simulation.E[0] ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const Ex = e.target.valueAsNumber;
              if (!isNaN(Ex)) {
                simulationPlayer.current.simulation.E[0] = Ex;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">E.y, V/m</p>
          <Input
            type="number"
            step="0.01"
            defaultValue={simulationPlayer.current?.simulation.E[1] ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const Ey = e.target.valueAsNumber;
              if (!isNaN(Ey)) {
                simulationPlayer.current.simulation.E[1] = Ey;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">C, m/s</p>
          <Input
            type="number"
            step="1000"
            defaultValue={simulationPlayer.current?.simulation.C ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const C = e.target.valueAsNumber;
              if (C >= 0 && !isNaN(C)) {
                simulationPlayer.current.simulation.C = C;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">lambda, m</p>
          <Input
            type="number"
            step="0.0001"
            defaultValue={simulationPlayer.current?.simulation.lambda ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const lambda = e.target.valueAsNumber;
              if (lambda >= 0 && !isNaN(lambda)) {
                simulationPlayer.current.simulation.lambda = lambda;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">vMin, 1/(m/s)</p>
          <Input
            type="number"
            step="0.0001"
            defaultValue={simulationPlayer.current?.simulation.vMin ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const vMin = e.target.valueAsNumber;
              if (vMin >= 0 && !isNaN(vMin)) {
                simulationPlayer.current.simulation.vMin = vMin;
              }
            }}
          />
        </Label>

        <Label>
          <p>vMax, 1/(m/s)</p>
          <Input
            type="number"
            step="0.0001"
            defaultValue={simulationPlayer.current?.simulation.vMax ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const vMax = e.target.valueAsNumber;
              if (vMax >= 0 && !isNaN(vMax)) {
                simulationPlayer.current.simulation.vMax = vMax;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">chargeMin, q</p>
          <Input
            type="number"
            step="1e-20"
            defaultValue={simulationPlayer.current?.simulation.chargeMin ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const chargeMin = e.target.valueAsNumber;
              if (chargeMin >= 0 && !isNaN(chargeMin)) {
                simulationPlayer.current.simulation.chargeMin = chargeMin;
              }
            }}
          />
        </Label>

        <Label>
          <p className="mb-1">chargeMax, q</p>
          <Input
            type="number"
            step="1e-20"
            defaultValue={simulationPlayer.current?.simulation.chargeMax ?? 0}
            onChange={(e) => {
              if (!simulationPlayer.current) {
                return;
              }

              const chargeMax = e.target.valueAsNumber;
              if (chargeMax >= 0 && !isNaN(chargeMax)) {
                simulationPlayer.current.simulation.chargeMax = chargeMax;
              }
            }}
          />
        </Label>
      </div>
    </Container>
  );
};
