/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getDevice } from './utils';

export class HeatConduction2D {
  private DR: number;
  private A: number;
  private MAX_TEMP: number;

  private width: number;
  private height: number;

  private format: GPUTextureFormat;
  private context: GPUCanvasContext;

  private device: GPUDevice = null!;
  private computePipeline: GPUComputePipeline = null!;

  private uniformBuffer: GPUBuffer = null!;

  private alignedBufferSize: number;

  private inputBuffer: GPUBuffer = null!;
  private outputBuffer: GPUBuffer = null!;

  private currentBindGroupIndex = 0;
  private computeBindGroups: GPUBindGroup[] = [];

  private renderPipeline: GPURenderPipeline = null!;
  private renderBindGroup: GPUBindGroup = null!;

  constructor(
    context: GPUCanvasContext,
    width: number,
    height: number,
    dr = 1,
    a = 1.5,
    maxTemp = 6000,
  ) {
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context = context;

    this.DR = dr;
    this.A = a;
    this.MAX_TEMP = maxTemp;

    const bytesPerElement = 4;
    this.width =
      (Math.ceil((Math.trunc(width / this.DR) * bytesPerElement) / 256) * 256) /
      bytesPerElement;
    this.height = Math.trunc(height / this.DR);

    this.alignedBufferSize = this.width * this.height * bytesPerElement;
  }

  async init() {
    this.device = await getDevice();

    this.context.configure({
      device: this.device,
      format: this.format,
    });

    this.initComputePipeline();
    this.initRenderPipeline();
  }

  private initComputePipeline() {
    const initialState = this.getInitialState();

    this.inputBuffer = this.device.createBuffer({
      size: this.alignedBufferSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.outputBuffer = this.device.createBuffer({
      size: this.alignedBufferSize,
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

    // Create shader module for the compute shader
    const shaderModule = this.device.createShaderModule({
      code: this.getComputeShaderCode(),
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
    this.computeBindGroups = [
      this.createComputeBindGroup(this.inputBuffer, this.outputBuffer),
      this.createComputeBindGroup(this.outputBuffer, this.inputBuffer),
    ];
  }

  private initRenderPipeline() {
    // Create render pipeline
    const renderShaderModule = this.device.createShaderModule({
      code: this.getRenderShaderCode(),
    });

    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: renderShaderModule,
        entryPoint: 'vertexMain',
        buffers: [],
      },
      fragment: {
        module: renderShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Create render bind group
    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.inputBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  private createComputeBindGroup(
    inputBuffer: GPUBuffer,
    outputBuffer: GPUBuffer,
  ) {
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

        if (this.isInShape(x, y)) {
          if (y > fn(x)) {
            state[index] = Math.random() * this.MAX_TEMP;
          } else {
            state[index] = this.MAX_TEMP * 0.9;
          }
        } else {
          state[index] = 0;
        }
      }
    }
    return state;
  }

  private getComputeShaderCode = () => `
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

  private getRenderShaderCode = () => `
    // Uniform buffer to store simulation parameters
    struct Uniforms {
      width: u32,   // Width of the simulation grid
      height: u32,  // Height of the simulation grid
      dt: f32,      // Time step for the simulation
    }

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) texCoord: vec2f,
    };

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var pos = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0),
        vec2f(-1.0, -1.0),
        vec2f(1.0, 1.0),
        vec2f(-1.0, 1.0)
      );

      var texCoord = array<vec2f, 6>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(1.0, 0.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, 0.0),
        vec2f(0.0, 0.0)
      );

      var output: VertexOutput;
      output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
      output.texCoord = texCoord[vertexIndex];
      return output;
    }

    @group(0) @binding(0) var<storage, read> data: array<f32>;
    @group(0) @binding(1) var<uniform> uniforms: Uniforms;

    @fragment
    fn fragmentMain(@location(0) coords: vec2f) -> @location(0) vec4f {
      let x: u32 = u32(coords.x * f32(uniforms.width));
      let y: u32 = u32(coords.y * f32(uniforms.height));

      let temp = data[y * uniforms.width + x];
      let color = tempToColor(temp);
      return vec4f(color, 1.0);
    }

    fn tempToColor(temp: f32) -> vec3f {
      let maxTemp: f32 = ${this.MAX_TEMP};
      let normalizedTemp = clamp(temp / maxTemp, 0.0, 1.0);
      if (normalizedTemp < 0.5) {
        return vec3f(0.0, 0.0, normalizedTemp * 2.0);
      } else {
        return vec3f((normalizedTemp - 0.5) * 2.0, 0.0, (1.0 - normalizedTemp) * 2.0);
      }
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
      passEncoder.setBindGroup(
        0,
        this.computeBindGroups[this.currentBindGroupIndex],
      );
      passEncoder.dispatchWorkgroups(workgroupsX, workgroupsY);

      // Toggle between 0 and 1 for next iteration
      this.currentBindGroupIndex = 1 - this.currentBindGroupIndex;
    }

    passEncoder.end();
    const gpuCommands = commandEncoder.finish();
    this.device.queue.submit([gpuCommands]);
  }

  render() {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(6);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
