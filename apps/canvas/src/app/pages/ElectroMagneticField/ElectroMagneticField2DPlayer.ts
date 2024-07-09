import { ElectroMagneticField2D } from './ElectroMagneticField2D';

export class ElectroMagneticField2DPlayer {
  simulation: ElectroMagneticField2D;

  private width: number;
  private height: number;
  private dr: number;

  private ctx: GPUCanvasContext;

  private isRunning = false;

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    dr = 1,
  ) {
    const ctx = canvas.getContext('webgpu');
    if (ctx === null) {
      throw new Error('Failed to get webgpu context');
    }
    this.ctx = ctx;

    this.width = width;
    this.height = height;
    this.dr = dr;

    this.simulation = new ElectroMagneticField2D(
      this.ctx,
      this.width,
      this.height,
    );
  }

  play(
    numSteps: number,
    cb: (performanceData: { fps: number; deltaTime: number }) => void,
  ) {
    this.isRunning = true;

    let lastTime = performance.now();

    const update = async () => {
      try {
        if (!this.isRunning) {
          return;
        }

        const now = performance.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        cb({ fps: 1000 / deltaTime, deltaTime });

        await this.simulation.runSimulation(numSteps);
        this.simulation.render();

        requestAnimationFrame(update);
      } catch (error) {
        console.error('An error occurred:', error);
      }
    };

    requestAnimationFrame(update);
  }

  pause() {
    this.isRunning = false;
  }

  async reset() {
    this.isRunning = false;

    this.simulation = new ElectroMagneticField2D(
      this.ctx,
      this.width,
      this.height,
      this.dr,
    );
    await this.simulation.init();

    await this.simulation.runSimulation(1);
    this.simulation.render();
  }
}
