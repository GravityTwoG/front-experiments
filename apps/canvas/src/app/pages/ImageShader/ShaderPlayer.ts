import { DistortionShader } from './DistortionShader';

export class ShaderPlayer {
  private shader: DistortionShader;

  private canvas: HTMLCanvasElement;
  private ctx: GPUCanvasContext;

  private isRunning = false;
  private mouseClickTime = 0;
  private mousePos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('webgpu');
    if (ctx === null) {
      throw new Error('Failed to get webgpu context');
    }
    this.canvas = canvas;
    this.ctx = ctx;

    this.shader = new DistortionShader(this.ctx);

    this.onMouseClick = this.onMouseClick.bind(this);
  }

  private onMouseClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();

    this.mousePos.x = (e.clientX - rect.left) / this.canvas.width;
    this.mousePos.y = (e.clientY - rect.top) / this.canvas.height;

    this.mouseClickTime = Date.now();
  }

  play(cb: (performanceData: { fps: number; deltaTime: number }) => void) {
    this.isRunning = true;

    this.canvas.addEventListener('click', this.onMouseClick);

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

        const t = (Date.now() - this.mouseClickTime) * 0.002;

        this.shader.render({
          t: Math.pow(t, 1 / 1.5),
          center: this.mousePos,
        });

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
    this.mouseClickTime = 0;
    this.canvas.removeEventListener('click', this.onMouseClick);

    this.shader = new DistortionShader(this.ctx);
    await this.shader.init();
    this.shader.render({ t: 0, center: this.mousePos });
  }
}
