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

  const resetSimulation = async () => {
    setIsRunning(false);
    await simulationPlayer.current?.reset();

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
          Charged particles in electro magnetic field: DR (DX, DY) = {dr}
        </p>

        <p className="m-2">
          FPS: {performanceData.fps.toFixed(2)}, Frame Time:{' '}
          {performanceData.deltaTime.toFixed(2)} ms, Steps per frame: {numSteps}
        </p>

        <p className="m-2">Press left mouse button to add particle</p>
      </div>

      <div className="m-2 rounded-lg overflow-hidden border-[1px] border-slate-400">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-w-full"
          onClick={(event) => {
            if (!canvasRef.current) {
              return;
            }

            if (isRunning) {
              const rect = canvasRef.current.getBoundingClientRect();
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
          Remove particles
        </Button>
      </div>

      {isRunning && (
        <Controls
          simulationPlayer={simulationPlayer.current!}
          key={isRunning.toString()}
        />
      )}
    </Container>
  );
};

const Controls = ({
  simulationPlayer,
}: {
  simulationPlayer: ElectroMagneticField2DPlayer;
}) => {
  const [state, _setState] = useState({
    dt: simulationPlayer.simulation.dt,
    electricFieldEnabled: simulationPlayer.simulation.electricFieldEnabled,
    magneticFieldEnabled: simulationPlayer.simulation.magneticFieldEnabled,
    B: simulationPlayer.simulation.B,
    C: simulationPlayer.simulation.C,
    E: simulationPlayer.simulation.E,
    lambda: simulationPlayer.simulation.lambda,
    vMin: simulationPlayer.simulation.vMin,
    vMax: simulationPlayer.simulation.vMax,
    chargeMin: simulationPlayer.simulation.chargeMin,
    chargeMax: simulationPlayer.simulation.chargeMax,
    massMin: simulationPlayer.simulation.massMin,
    massMax: simulationPlayer.simulation.massMax,
  });

  const setState = (newState: Partial<typeof state>) => {
    _setState((oldState) => ({
      ...oldState,
      ...newState,
    }));
  };

  return (
    <div className="m-2 flex flex-wrap gap-2">
      <div className="flex-grow-1 flex-shrink-0 w-full mb-2">
        <Button
          onClick={() => {
            simulationPlayer.simulation.removeParticles();
            simulationPlayer.simulation.dt = 10000000000;
            simulationPlayer.simulation.electricFieldEnabled = false;
            simulationPlayer.simulation.magneticFieldEnabled = false;
            simulationPlayer.simulation.vMin = 0;
            simulationPlayer.simulation.vMax = 0;
            simulationPlayer.simulation.chargeMin = 1e-16;
            simulationPlayer.simulation.chargeMax = 1.6e-16;
            setState({
              dt: 10000000000,
              electricFieldEnabled: false,
              magneticFieldEnabled: false,
              vMin: 0,
              vMax: 0,
              chargeMin: 1e-16,
              chargeMax: 1.6e-16,
            });
          }}
        >
          Preset 1 (Just particles)
        </Button>
      </div>

      <Label>
        <p className="mb-1">dt</p>
        <Input
          type="number"
          step="0.01"
          value={state.dt}
          onChange={(e) => {
            const dt = e.target.valueAsNumber;
            if (dt > 0 && !isNaN(dt)) {
              simulationPlayer.simulation.dt = dt;
              setState({ dt });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">Electric Field</p>
        <Input
          type="checkbox"
          checked={state.electricFieldEnabled}
          onChange={(e) => {
            simulationPlayer.simulation.electricFieldEnabled = e.target.checked;
            setState({ electricFieldEnabled: e.target.checked });
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">Magnetic Field</p>
        <Input
          type="checkbox"
          checked={state.magneticFieldEnabled}
          onChange={(e) => {
            simulationPlayer.simulation.magneticFieldEnabled = e.target.checked;
            setState({ magneticFieldEnabled: e.target.checked });
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">B, Tsl</p>
        <Input
          type="number"
          step="0.0001"
          value={state.B}
          onChange={(e) => {
            const B = e.target.valueAsNumber;
            if (!isNaN(B)) {
              simulationPlayer.simulation.B = B;
              setState({ B });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">E.x, V/m</p>
        <Input
          type="number"
          step="0.01"
          value={state.E[0]}
          onChange={(e) => {
            const Ex = e.target.valueAsNumber;
            if (!isNaN(Ex)) {
              simulationPlayer.simulation.E[0] = Ex;
              setState({ E: simulationPlayer.simulation.E });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">E.y, V/m</p>
        <Input
          type="number"
          step="0.01"
          value={state.E[1]}
          onChange={(e) => {
            const Ey = e.target.valueAsNumber;
            if (!isNaN(Ey)) {
              simulationPlayer.simulation.E[1] = Ey;
              setState({ E: simulationPlayer.simulation.E });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">C, m/s</p>
        <Input
          type="number"
          step="1000"
          value={state.C}
          onChange={(e) => {
            const C = e.target.valueAsNumber;
            if (C >= 0 && !isNaN(C)) {
              simulationPlayer.simulation.C = C;
              setState({ C });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">lambda, m</p>
        <Input
          type="number"
          step="0.0001"
          value={state.lambda}
          onChange={(e) => {
            const lambda = e.target.valueAsNumber;
            if (lambda >= 0 && !isNaN(lambda)) {
              simulationPlayer.simulation.lambda = lambda;
              setState({ lambda });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">vMin, 1/(m/s)</p>
        <Input
          type="number"
          step="0.0001"
          value={state.vMin}
          onChange={(e) => {
            const vMin = e.target.valueAsNumber;
            if (vMin >= 0 && !isNaN(vMin)) {
              simulationPlayer.simulation.vMin = vMin;
              setState({ vMin });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">vMax, 1/(m/s)</p>
        <Input
          type="number"
          step="0.0001"
          value={state.vMax}
          onChange={(e) => {
            const vMax = e.target.valueAsNumber;
            if (vMax >= 0 && !isNaN(vMax)) {
              simulationPlayer.simulation.vMax = vMax;
              setState({ vMax });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">chargeMin, q</p>
        <Input
          type="number"
          step="1e-20"
          value={state.chargeMin}
          onChange={(e) => {
            const chargeMin = e.target.valueAsNumber;
            if (chargeMin >= 0 && !isNaN(chargeMin)) {
              simulationPlayer.simulation.chargeMin = chargeMin;
              setState({ chargeMin });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">chargeMax, q</p>
        <Input
          type="number"
          step="1e-20"
          value={state.chargeMax}
          onChange={(e) => {
            const chargeMax = e.target.valueAsNumber;
            if (chargeMax >= 0 && !isNaN(chargeMax)) {
              simulationPlayer.simulation.chargeMax = chargeMax;
              setState({ chargeMax });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">massMin, kg</p>
        <Input
          type="number"
          step="1e-20"
          value={state.massMin}
          onChange={(e) => {
            const massMin = e.target.valueAsNumber;
            if (massMin >= 0 && !isNaN(massMin)) {
              simulationPlayer.simulation.massMin = massMin;
              setState({ massMin });
            }
          }}
        />
      </Label>

      <Label>
        <p className="mb-1">massMax, kg</p>
        <Input
          type="number"
          step="1e-20"
          value={state.massMax}
          onChange={(e) => {
            const massMax = e.target.valueAsNumber;
            if (massMax >= 0 && !isNaN(massMax)) {
              simulationPlayer.simulation.massMax = massMax;
              setState({ massMax });
            }
          }}
        />
      </Label>
    </div>
  );
};
