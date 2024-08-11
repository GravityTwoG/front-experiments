import { useEffect, useRef } from 'react';

import { Container } from '@front-experiments/ui/components/ui/Container';

import { ShaderPlayer } from './ShaderPlayer';

const width = 640;
const height = 640;

export const ImageShaderWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let player: ShaderPlayer | null = null;
    async function init() {
      const canvas = canvasRef.current;
      if (canvas === null) {
        return;
      }
      player = new ShaderPlayer(canvas, width, height);

      await player.reset();
      player.play((perfData) => {
        // console.log(perfData);
      });
    }

    init();

    return () => {
      player?.reset();
    };
  }, [canvasRef]);

  return (
    <Container className="py-4 flex flex-col justify-center items-center">
      <div className="m-auto rounded-lg overflow-hidden border-[1px] border-slate-400">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-w-full"
        ></canvas>
      </div>
    </Container>
  );
};
