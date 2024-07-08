/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getDevice } from './utils';

export class HeatConduction2D {
  private DR: number;
  private A: number;
  private MAX_TEMP: number;

  private width: number;
  private height: number;

  private device: GPUDevice = null!;
  private computePipeline: GPUComputePipeline = null!;

  private uniformBuffer: GPUBuffer = null!;

  private bufferSize = 0;
  private inputBuffer: GPUBuffer = null!;
  private outputBuffer: GPUBuffer = null!;

  private readBuffer: GPUBuffer = null!;

  private currentBindGroupIndex = 0;
  private bindGroups: GPUBindGroup[] = [];

  constructor(width: number, height: number, dr = 1, a = 1.5, maxTemp = 6000) {
    this.DR = dr;
    this.A = a;
    this.MAX_TEMP = maxTemp;

    this.width = Math.trunc(width / this.DR);
    this.height = Math.trunc(height / this.DR);
  }

  async init() {
    this.device = await getDevice();

    // Create buffers
    const initialState = this.getInitialState();
    this.bufferSize = initialState.byteLength;

    this.inputBuffer = this.device.createBuffer({
      size: this.bufferSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.outputBuffer = this.device.createBuffer({
      size: this.bufferSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.device.queue.writeBuffer(this.inputBuffer, 0, initialState);

    this.uniformBuffer = this.device.createBuffer({
      size: 12, // 3 * 4 bytes (2 u32s and 1 f32)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformData = new ArrayBuffer(12);
    new Uint32Array(uniformData, 0, 2).set([this.width, this.height]);
    const dt = 0.1;
    new Float32Array(uniformData, 8, 1)[0] = dt;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    this.readBuffer = this.device.createBuffer({
      size: this.bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // Create shader module for the compute shader
    const shaderModule = this.device.createShaderModule({
      code: this.getShaderCode(),
    });

    // Create compute pipeline
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    // Create initial bind groups
    this.currentBindGroupIndex = 0;
    this.bindGroups = [
      this.createBindGroup(this.inputBuffer, this.outputBuffer),
      this.createBindGroup(this.outputBuffer, this.inputBuffer),
    ];
  }

  private createBindGroup(inputBuffer: GPUBuffer, outputBuffer: GPUBuffer) {
    return this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  private isInShape(x: number, y: number) {
    return (
      x > this.width / 4 &&
      x < (3 * this.width) / 4 &&
      y > this.height / 4 &&
      y < (3 * this.height) / 4
    );
  }

  private getInitialState() {
    const state = new Float32Array(this.width * this.height);

    const fn = (x: number) => (x * this.height) / this.width;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;

        if (this.isInShape(x, y) && y > fn(x)) {
          state[index] = (Math.random() + 1) * this.MAX_TEMP;
        } else if (this.isInShape(x, y)) {
          state[index] = this.MAX_TEMP * 0.6;
        } else {
          state[index] = 0;
        }
      }
    }
    return state;
  }

  private getShaderCode = () => `
  // Input buffer containing the current temperature state
  @group(0) @binding(0) var<storage, read> input: array<f32>;
  
  // Output buffer to store the updated temperature state
  @group(0) @binding(1) var<storage, read_write> output: array<f32>;

  // Uniform buffer to store simulation parameters
  struct Uniforms {
    width: u32,   // Width of the simulation grid
    height: u32,  // Height of the simulation grid
    dt: f32,      // Time step for the simulation
  }
  @group(0) @binding(2) var<uniform> uniforms: Uniforms;

  // Constants for the heat equation
  const DR: f32 = ${this.DR};  // Spatial discretization
  const A: f32 = ${this.A};    // Thermal diffusivity

  // Function to calculate the 1D index from 2D coordinates
  fn getIndex(x: u32, y: u32) -> u32 {
    return y * uniforms.width + x;
  }

  fn isInShape(x: u32, y: u32) -> bool {
    return (
      x > uniforms.width / 4 &&
      x < (3 * uniforms.width) / 4 &&
      y > uniforms.height / 4 &&
      y < (3 * uniforms.height) / 4
    );
  }

  fn getTemp(cx: u32, cy: u32, x: u32, y: u32) -> f32 {
    if (isInShape(x, y)) {
      return input[getIndex(x, y)];
    } else {
      return input[getIndex(cx, cy)];
    }
  }

  // Function to calculate the change in temperature for a given cell
  fn dTemp(x: u32, y: u32) -> f32 {
    let curr = input[getIndex(x, y)];
    
    let top = getTemp(x, y, x, y - 1);
    let bottom = getTemp(x, y, x, y + 1);
    let left = getTemp(x, y, x - 1, y);
    let right = getTemp(x, y, x + 1, y);

    // Calculate and return the change in temperature
    return (A * (top + bottom + left + right - 4.0 * curr)) / (DR * DR);
  }

  // compute shader
  @compute @workgroup_size(16, 16)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;

    // Ensure we're within the simulation grid
    if (x >= uniforms.width || y >= uniforms.height) {
      return;
    }
    if (!isInShape(x, y)) {
      return;
    }

    let index = getIndex(x, y);

    // Update the temperature using the heat equation
    output[index] = input[index] + dTemp(x, y) * uniforms.dt;
  }
`;

  // Main function to set up and run the simulation
  async runSimulation(numSteps: number) {
    // Run simulation
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);

    const workgroupsX = Math.ceil(this.width / 16);
    const workgroupsY = Math.ceil(this.height / 16);

    for (let i = 0; i < numSteps; i++) {
      passEncoder.setBindGroup(0, this.bindGroups[this.currentBindGroupIndex]);
      passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

      // Toggle between 0 and 1 for next iteration
      this.currentBindGroupIndex = 1 - this.currentBindGroupIndex;
    }

    passEncoder.end();

    // Read back the result
    commandEncoder.copyBufferToBuffer(
      this.inputBuffer,
      0,
      this.readBuffer,
      0,
      this.bufferSize,
    );

    const gpuCommands = commandEncoder.finish();
    this.device.queue.submit([gpuCommands]);

    await this.readBuffer.mapAsync(GPUMapMode.READ);
    const resultArrayBuffer = this.readBuffer.getMappedRange();
    const resultArray = new Float32Array(resultArrayBuffer.slice(0));
    this.readBuffer.unmap();

    return resultArray;
  }

  renderHeatMap(data: Float32Array, ctx: CanvasRenderingContext2D) {
    // Create an ImageData object
    const imageData = ctx.createImageData(this.width, this.height);

    // Fill the ImageData
    for (let i = 0; i < data.length; i++) {
      const [r, g, b] = this.tempToColor(data[i]);
      const pixelIndex = i * 4;
      imageData.data[pixelIndex] = r;
      imageData.data[pixelIndex + 1] = g;
      imageData.data[pixelIndex + 2] = b;
      imageData.data[pixelIndex + 3] = 255; // Full opacity
    }

    // Put the ImageData on the canvas
    ctx.putImageData(imageData, 0, 0);
  }

  private tempToColor(temp: number): [number, number, number] {
    const normalizedTemp = Math.min(Math.max(temp / this.MAX_TEMP, 0), 1);

    if (normalizedTemp < 0.5) {
      return [0, 0, Math.floor(normalizedTemp * 2 * 255)];
    } else {
      return [
        Math.floor((normalizedTemp - 0.5) * 2 * 255),
        0,
        Math.floor((1 - normalizedTemp) * 2 * 255),
      ];
    }
  }
}
