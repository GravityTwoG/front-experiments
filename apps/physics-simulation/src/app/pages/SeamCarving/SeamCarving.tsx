import { useEffect, useRef, useState } from 'react';

import { Panel } from '@front-experiments/ui';

export const SeamCarving = () => {
  const [image, setImage] = useState<File | undefined>(undefined);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    ctxRef.current = ctx;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  useEffect(() => {
    if (image === undefined) {
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(image);

    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas === null || ctx === null) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      setWidth(img.width);
      setHeight(img.height);
    };
  }, [canvasRef, ctxRef, image]);

  return (
    <div>
      <form>
        <input type="file" onChange={(e) => setImage(e.target.files?.[0])} />
        <label>
          <p>Width</p>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          <p>Height</p>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>
      </form>

      <Panel className="m-2 overflow-hidden p-0 inline-block">
        <canvas ref={canvasRef} width={300} height={300}></canvas>
      </Panel>
    </div>
  );
};
