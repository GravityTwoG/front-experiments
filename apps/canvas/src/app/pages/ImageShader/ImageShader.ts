// shader that just renders texture
export class ImageShader {
  protected width: number;
  protected height: number;

  protected device: GPUDevice;
  protected format: GPUTextureFormat;

  protected texture: GPUTexture = null!;

  protected renderPipeline: GPURenderPipeline = null!;
  protected renderBindGroup: GPUBindGroup = null!;

  constructor(
    width: number,
    height: number,
    device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    this.width = width;
    this.height = height;
    this.format = format;
    this.device = device;
  }

  async init(inputTexture: GPUTexture) {
    this.texture = inputTexture;

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
      ],
    });
  }

  protected getStructuresDefinition() {
    return `
      @group(0) @binding(0) var mySampler: sampler;
      @group(0) @binding(1) var myTexture: texture_2d<f32>;

      const aspect: vec2<f32> = vec2(1, ${this.width / this.height});
      const textureAspect = f32(${this.texture.width}) / f32(${this.texture.height});

      struct VertexOutput {
        @builtin(position) Position : vec4f,
        @location(0) fragUV : vec2f,
      }`;
  }

  protected getVertexShaderCode() {
    return `
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

        // Adjust UV based on aspect ratios
        var adjustedUV = uv[VertexIndex];
        if (textureAspect > aspect.y) {
          // Texture is wider, adjust vertically
          let scale = aspect.y / textureAspect;
          adjustedUV.y = (adjustedUV.y - 0.5) * scale + 0.5;
        } else {
          // Texture is taller, adjust horizontally
          let scale = aspect.y / textureAspect;
          adjustedUV.x = (adjustedUV.x - 0.5) * scale + 0.5;
        }

        output.fragUV = adjustedUV;
        return output;
      }`;
  }

  protected getFragmentShaderCode() {
    return `
      @fragment
      fn fragmentMain(@location(0) fragUV : vec2f) -> @location(0) vec4f {
        let color = textureSample(myTexture, mySampler, fragUV);
        return color;
      }`;
  }

  protected getRenderShaderCode() {
    return `
      ${this.getStructuresDefinition()}

      ${this.getVertexShaderCode()}

      ${this.getFragmentShaderCode()}`;
  }

  async render(outputTexture: GPUTexture) {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const renderPassDescriptor = {
      label: 'ImageShader renderPass',
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
      label: 'ImageShader encoder',
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.renderBindGroup);
    pass.draw(6); // call our vertex shader 6 times
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
