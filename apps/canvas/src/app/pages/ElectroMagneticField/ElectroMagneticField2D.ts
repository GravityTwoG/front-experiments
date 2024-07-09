/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getDevice } from '../../utils';

function randInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

export class ElectroMagneticField2D {
  private DR: number;

  private B = 5e-4; // Tsl
  private E = [2e3, 1e-1]; // V/m
  private lambda = 1e-3; // m
  private C = 3e8; // Speed of light, m/s

  private vMax = 8e6 / this.C;
  private vMin = 0.4 * this.vMax;

  private maxCharge = 1.6e-19;
  private minCharge = 0.3 * this.maxCharge;
  private maxChargesCount = 30;
  private mass = 9.11e-31;
  private dt = 1.1;

  private width: number;
  private height: number;

  private format: GPUTextureFormat;
  private context: GPUCanvasContext;

  private device: GPUDevice = null!;
  private computePipeline: GPUComputePipeline = null!;

  private uniformBuffer: GPUBuffer = null!;
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
  ) {
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context = context;

    this.DR = dr;

    this.width = Math.trunc(width / this.DR);
    this.height = Math.trunc(height / this.DR);
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

    const chargesByteSize = this.maxChargesCount * 28;

    this.inputBuffer = this.device.createBuffer({
      size: chargesByteSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.outputBuffer = this.device.createBuffer({
      size: chargesByteSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.device.queue.writeBuffer(this.inputBuffer, 0, initialState);

    const uniformBufferSize = 48;
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformData = new ArrayBuffer(uniformBufferSize);
    let offset = 0;
    new Uint32Array(uniformData, offset, 2).set([this.width, this.height]);
    offset += 4 * 2;

    new Float32Array(uniformData, offset, 6).set([
      this.dt,
      this.B,
      this.E[0],
      this.E[1],
      this.lambda,
      this.C,
    ]);
    offset += 4 * 6;

    const isElectricFieldEnabled = 1;
    new Uint32Array(uniformData, offset, 2).set([
      isElectricFieldEnabled,
      this.maxChargesCount,
    ]);
    offset += 4 * 2;

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

  private getInitialState() {
    const state = new ArrayBuffer(this.maxChargesCount * 7 * 4);

    for (let i = 0; i < this.maxChargesCount; i++) {
      const x = randInRange(0, this.width);
      const y = randInRange(0, this.height);

      const charge = randInRange(this.minCharge, this.maxCharge) * randSign();

      const vx = randInRange(this.vMin, this.vMax) * randSign();
      const vy = randInRange(this.vMin, this.vMax) * randSign();

      const isPhysical = 1;

      new Float32Array(state, i * 7 * 4, 6).set([
        x,
        y,
        vx,
        vy,
        charge,
        this.mass,
      ]);
      new Uint32Array(state, i * 7 * 4 + 6 * 4, 1).set([isPhysical]);
    }

    return state;
  }

  private isInMagneticField = `
    fn isInMagneticField(x: f32, y: f32) -> bool {
      let padding = f32(uniforms.width / 5);
      
      return (x < f32(uniforms.width) - padding && 
              y < f32(uniforms.height) - padding && 
              x > padding && 
              y > padding);
    }
  `;

  private getComputeShaderCode = () => `
    struct Particle {
      x: f32,
      y: f32,
      vx: f32,
      vy: f32,
      charge: f32,
      mass: f32,
      isPhysical: u32,
    }

    @group(0) @binding(0) var<storage, read> input: array<Particle>;
    @group(0) @binding(1) var<storage, read_write> output: array<Particle>;

    struct Uniforms {
      width: u32,   // Width of the simulation grid
      height: u32,  // Height of the simulation grid
      dt: f32,      // Time step for the simulation
      B: f32,       // Magnetic field strength
      E: vec2<f32>, // Electric field strength
      lambda: f32,  
      C: f32,
      electricFieldEnabled: u32,
      chargesCount: u32,
    }
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    ${this.isInMagneticField}

    fn dF(p: Particle, idx: u32) -> vec4<f32> {
      let k = p.charge * uniforms.lambda / (p.mass * uniforms.C);
      var E = vec2<f32>(0, 0);

      for (var i: u32 = 0; i < uniforms.chargesCount; i++) {
        var q = input[i];
        if (q.isPhysical == 0 || i == idx) {
          continue;
        }

        var r = vec2(p.x - q.x, p.y - q.y);
        let Eq = q.charge*r / (r*r*r+0.1);

        E += k * Eq;
      }

      if (isInMagneticField(p.x, p.y)) {
        let B = uniforms.B * k;
        E += vec2(
          uniforms.E.x * k / uniforms.C, 
          uniforms.E.y * k / uniforms.C
        );

        if (uniforms.electricFieldEnabled == 0) {
          E.x = 0;
          E.y = 0;
        }

        return vec4<f32>(
          p.vx,
          p.vy,
          E.x + B * p.vy,
          E.y - B * p.vx
        );
      }

      return vec4<f32>(
        p.vx,
        p.vy,
        E.x,
        E.y
      );
    }

    // compute shader
    @compute @workgroup_size(16)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let idx = global_id.x;
      if (idx >= uniforms.chargesCount) {
        return;
      }

      var p = input[idx];
      if (p.isPhysical == 0) {
        return;
      }  

      // RK4 method for solving ODE
      var p2 = Particle(
        p.x,
        p.y,
        p.vx,
        p.vy,
        p.charge,
        p.mass,
        p.isPhysical
      );
      
      let d1 = dF(p2, idx);
      p2.x = p.x + d1.x * uniforms.dt / 2.0;
      p2.y = p.y + d1.y * uniforms.dt / 2.0;
      p2.vx = p.vx + d1.z * uniforms.dt / 2.0;
      p2.vy = p.vy + d1.w * uniforms.dt / 2.0;

      let d2 = dF(p2, idx);
      p2.x = p.x + d2.x * uniforms.dt / 2.0;
      p2.y = p.y + d2.y * uniforms.dt / 2.0;
      p2.vx = p.vx + d2.z * uniforms.dt / 2.0;
      p2.vy = p.vy + d2.w * uniforms.dt / 2.0;

      let d3 = dF(p2, idx);
      p2.x = p.x + d3.x * uniforms.dt;
      p2.y = p.y + d3.y * uniforms.dt;
      p2.vx = p.vx + d3.z * uniforms.dt;
      p2.vy = p.vy + d3.w * uniforms.dt;

      let d4 = dF(p2, idx);
      p.x = p.x + (d1.x + 2.0 * d2.x + 2.0 * d3.x + d4.x) * uniforms.dt / 6.0;
      p.y = p.y + (d1.y + 2.0 * d2.y + 2.0 * d3.y + d4.y) * uniforms.dt / 6.0;
      p.vx = p.vx + (d1.z + 2.0 * d2.z + 2.0 * d3.z + d4.z) * uniforms.dt / 6.0;
      p.vy = p.vy + (d1.w + 2.0 * d2.w + 2.0 * d3.w + d4.w) * uniforms.dt / 6.0;

      if (p.x > f32(uniforms.width)) {
        p.vx = -abs(p.vx)*0.9;
        p.x = f32(uniforms.width);
      }

      if (p.x < 0.0) {
        p.vx = abs(p.vx)*0.9;
        p.x = 0.0;
      }

      if (p.y > f32(uniforms.height)) {
        p.vy = -abs(p.vy)*0.9;
        p.y = f32(uniforms.height);
      }

      if (p.y < 0.0) {
        p.vy = abs(p.vy)*0.9;
        p.y = 0.0;
      }
      output[idx] = p;
    }
  `;

  private getRenderShaderCode = () => `
    struct Particle {
      x: f32,
      y: f32,
      vx: f32,
      vy: f32,
      charge: f32,
      mass: f32,
      isPhysical: u32,
    }

    // Uniform buffer to store simulation parameters
    struct Uniforms {
      width: u32,   // Width of the simulation grid
      height: u32,  // Height of the simulation grid
      dt: f32,      // Time step for the simulation
      B: f32,       // Magnetic field strength
      E: vec2<f32>, // Electric field strength
      lambda: f32, 
      C: f32,
      electricFieldEnabled: u32,
      chargesCount: u32,
    }

    @group(0) @binding(0) var<storage, read> data: array<Particle>;
    @group(0) @binding(1) var<uniform> uniforms: Uniforms;

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

    ${this.isInMagneticField}

    @fragment
    fn fragmentMain(@location(0) coords: vec2f) -> @location(0) vec4f {
      let x: u32 = u32(coords.x * f32(uniforms.width));
      let y: u32 = u32(coords.y * f32(uniforms.height));

      if (x >= uniforms.width || y >= uniforms.height) {
        return vec4f(0.0, 0.0, 0.0, 0.0);
      }

      var E: f32 = 0;
      for (var i: u32 = 0; i < uniforms.chargesCount; i++) {
        let particle = data[i];
        let tForce = vec2f(
          f32(x) - particle.x, // dx
          f32(y) - particle.y  // dy
        );

        let length2 = tForce.x*tForce.x + tForce.y*tForce.y;
        E += particle.charge / (length2 + 1);
      }

      var color = vec4f(0.0, 0.0, 0.0, 1.0);

      if (isInMagneticField(f32(x), f32(y))) {
        let blueViolet = vec4f(0.5, 0.0, 1.0, 0.2);
        color = mix(color, blueViolet, 0.3);
      }

      let brightness = abs(E) / ${this.maxCharge * this.DR} * 100;
      if (E > 0.0) {
        color.r = max(color.r, brightness);
      } else {
        color.b = max(color.b, brightness);
      }
      
      return color;
    }
  `;

  // Main function to set up and run the simulation
  async runSimulation(numSteps: number) {
    // Run simulation
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);

    const workgroupsX = Math.ceil(this.maxChargesCount / 16);

    for (let i = 0; i < numSteps; i++) {
      passEncoder.setBindGroup(
        0,
        this.computeBindGroups[this.currentBindGroupIndex],
      );
      passEncoder.dispatchWorkgroups(workgroupsX);

      // Toggle between 0 and 1 for next iteration
      this.currentBindGroupIndex = 1 - this.currentBindGroupIndex;
    }

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  render() {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'load',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(this.maxChargesCount);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
