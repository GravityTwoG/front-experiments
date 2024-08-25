import { ImageShader } from './ImageShader';

type UniformData = {
  t: number;
  center: {
    x: number;
    y: number;
  };
};

export class DistortionShader extends ImageShader {
  private uniformBuffer: GPUBuffer;

  protected renderPipeline: GPURenderPipeline = null!;
  protected renderBindGroup: GPUBindGroup = null!;

  constructor(
    width: number,
    height: number,
    device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    super(width, height, device, format);

    const uniformBufferSizeInBytes = 16; // 1 f32, 1 vec2<f32>, and aligned by 16
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSizeInBytes,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  async init(inputTexture: GPUTexture) {
    await super.init(inputTexture);

    this.initRenderPipeline();
  }

  protected initRenderPipeline() {
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

    const sampler = this.device.createSampler({
      addressModeU: 'mirror-repeat',
      addressModeV: 'mirror-repeat',
      minFilter: 'linear',
      magFilter: 'linear',
    });

    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: this.texture.createView() },
        {
          binding: 2,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });
  }

  protected getStructuresDefinition = () => `
    ${super.getStructuresDefinition()}

    struct Uniforms {
      t: f32, // time
      center: vec2<f32>, // center of distortion circle
    };
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    const maxRadius: f32 = 0.25;
  `;

  protected getFragmentShaderCode = () => `
    @fragment
    fn fragmentMain(@location(0) fragUV : vec2f) -> @location(0) vec4f {
      var dir = uniforms.center - fragUV;

      var rDistance = getOffsetStrength(uniforms.t + 0.1, dir);
      var gDistance = getOffsetStrength(uniforms.t, dir);
      var bDistance = getOffsetStrength(uniforms.t - 0.1, dir);

      dir = normalize(dir);

      let r = getColor(fragUV + dir * rDistance).r;
      let g = getColor(fragUV + dir * gDistance).g;
      let b = getColor(fragUV + dir * bDistance).b;

      let shading = gDistance * 5.0;

      return vec4f(r + shading, g + shading, b + shading, 1.0);
    }

    // get color from texture
    fn getColor(pos: vec2f) -> vec4f {
      let texColor = textureSample(myTexture, mySampler, pos);
      let isInBounds = (pos.x >= 0.0 && pos.x <= 1.0 && pos.y >= 0.0 && pos.y <= 1.0);

      return select(vec4(0.0, 0.0, 0.0, 1.0), texColor, vec4(isInBounds));
    }

    // get smoothed distance to circle arc
    fn getOffsetStrength(t: f32, dir: vec2<f32>) -> f32 {
      var strength = length(dir / aspect) - t * maxRadius;

      strength *= 1.0 - smoothstep(0.0, 0.05, abs(strength));

      strength *= smoothstep(0., 0.05, t);
      strength *= 1.0 - smoothstep(0.5, 1., t);

      return strength;
    }
  `;

  private writeUniforms(data: UniformData) {
    const uniformData = new ArrayBuffer(16);
    const f32View = new Float32Array(uniformData, 0, 4);
    f32View[0] = data.t;
    f32View[2] = data.center.x;
    f32View[3] = data.center.y;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  setData(data: UniformData) {
    this.writeUniforms(data);
  }

  async render(outputTexture: GPUTexture) {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const renderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
        {
          view: outputTexture.createView(),
          clearValue: [0, 0, 0, 0],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    } satisfies GPURenderPassDescriptor;

    const encoder = this.device.createCommandEncoder({
      label: 'render quad encoder',
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.renderBindGroup);
    pass.draw(6); // call our vertex shader 6 times
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
