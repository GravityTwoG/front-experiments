import { getDevice, loadImageBitmap } from '../../utils';
import { DistortionShader } from './DistortionShader';
import { ImageShader } from './ImageShader';

export class ShaderPlayer {
  private shaders: ImageShader[] = [];
  private textures: GPUTexture[] = [];

  private canvas: HTMLCanvasElement;
  private ctx: GPUCanvasContext;

  private device: GPUDevice | null = null;
  private format: GPUTextureFormat;

  private isRunning = false;
  private mouseClickTime = 0;
  private mousePos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('webgpu');
    if (ctx === null) {
      throw new Error('Failed to get webgpu context');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.onMouseClick = this.onMouseClick.bind(this);
  }

  async init() {
    this.device = await getDevice();

    this.ctx.configure({
      device: this.device,
      format: this.format,
    });

    const url = '/spider-robot.jpeg';
    const source = await loadImageBitmap(url);

    const imgTexture = this.device.createTexture({
      label: url,
      format: 'rgba8unorm',
      size: [source.width, source.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture: imgTexture },
      { width: source.width, height: source.height },
    );

    this.textures.push(imgTexture);

    this.shaders.push(
      new DistortionShader(
        this.canvas.width,
        this.canvas.height,
        this.device,
        this.format,
      ),
    );
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

        this.runPipeline();

        requestAnimationFrame(update);
      } catch (error) {
        console.error('An error occurred:', error);
      }
    };

    requestAnimationFrame(update);
  }

  private async runPipeline() {
    const t = (Date.now() - this.mouseClickTime) * 0.002;

    for (const shader of this.shaders) {
      if (shader instanceof DistortionShader) {
        shader.setData({ t: Math.pow(t, 1 / 1.5), center: this.mousePos });
      }
    }
    for (const [idx, shader] of this.shaders.entries()) {
      if (idx === this.shaders.length - 1) {
        await shader.render(this.ctx.getCurrentTexture());
      } else {
        await shader.render(this.textures[idx + 1]);
      }
    }
  }

  pause() {
    this.isRunning = false;
  }

  async reset() {
    this.isRunning = false;
    this.mouseClickTime = 0;
    this.canvas.removeEventListener('click', this.onMouseClick);

    for (const [idx, shader] of this.shaders.entries()) {
      await shader.init(this.textures[idx]);
    }

    this.runPipeline();
  }
}
