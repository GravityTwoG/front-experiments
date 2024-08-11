import { getDevice, loadImageBitmap } from '../../utils';

type UniformData = {
  t: number;
  center: {
    x: number;
    y: number;
  };
};

export class DistortionShader {
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;

  private device: GPUDevice = null!;

  private uniformBuffer: GPUBuffer = null!;

  private texture: GPUTexture = null!;

  private textureWidth = 0;
  private textureHeight = 0;

  private renderPipeline: GPURenderPipeline = null!;
  private renderBindGroup: GPUBindGroup = null!;

  constructor(context: GPUCanvasContext) {
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
  }

  async init() {
    this.device = await getDevice();

    this.context.configure({
      device: this.device,
      format: this.format,
    });

    const uniformBufferSizeInBytes = 16; // 1 f32, 1 vec2<f32>, and aligned by 16
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSizeInBytes,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const url = '/spider-robot.jpeg';
    const source = await loadImageBitmap(url);

    this.textureWidth = source.width;
    this.textureHeight = source.height;

    this.texture = this.device.createTexture({
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
      { texture: this.texture },
      { width: source.width, height: source.height },
    );

    this.initRenderPipeline();
  }

  private writeUniforms(data: UniformData) {
    const uniformData = new ArrayBuffer(16);
    const f32View = new Float32Array(uniformData, 0, 4);
    f32View[0] = data.t;
    f32View[2] = data.center.x;
    f32View[3] = data.center.y;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
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

  private getRenderShaderCode = () => `
    @group(0) @binding(0) var mySampler: sampler;
    @group(0) @binding(1) var myTexture: texture_2d<f32>;

    struct Uniforms {
      t: f32, // time
      center: vec2<f32>, // center of distortion circle
    };
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    const aspect: vec2<f32> = vec2(1, ${this.context.canvas.width / this.context.canvas.height});
    const maxRadius: f32 = 0.25;

    struct VertexOutput {
      @builtin(position) Position : vec4f,
      @location(0) fragUV : vec2f,
    }

    @vertex
    fn vertexMain(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      const pos = array(
        vec2( 1.0,  1.0),
        vec2( 1.0, -1.0),
        vec2(-1.0, -1.0),
        vec2( 1.0,  1.0),
        vec2(-1.0, -1.0),
        vec2(-1.0,  1.0),
      );

      const uv = array(
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
      );

      var output : VertexOutput;
      output.Position = vec4(pos[VertexIndex], 0.0, 1.0);

      // Calculate aspect ratios
      let textureAspect = f32(${this.textureWidth}) / f32(${this.textureHeight});
      let viewportAspect = f32(${this.context.canvas.width}) / f32(${this.context.canvas.height});

      // Adjust UV based on aspect ratios
      var adjustedUV = uv[VertexIndex];
      if (textureAspect > viewportAspect) {
        // Texture is wider, adjust vertically
        let scale = viewportAspect / textureAspect;
        adjustedUV.y = (adjustedUV.y - 0.5) * scale + 0.5;
      } else {
        // Texture is taller, adjust horizontally
        let scale = viewportAspect / textureAspect;
        adjustedUV.x = (adjustedUV.x - 0.5) * scale + 0.5;
      }

      output.fragUV = adjustedUV;
      return output;
    }

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

      return vec4f(r + shading, g + shading, b + shading, 1);
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

  render(data: UniformData) {
    this.writeUniforms(data);

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const renderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
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
