import React from 'react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@front-experiments/ui/components/ui/input';
import { Label } from '@front-experiments/ui/components/ui/label';
import { seamCarve } from './seamCarvingSim';
import { copyMatrix } from './matrix';

const imageDataToMatrix = (img: ImageData) => {
  const width = img.width;
  const height = img.height;
  const matrix = new Array<number[]>(height);
  for (let y = 0; y < height; ++y) {
    matrix[y] = new Array<number>(width);
    for (let x = 0; x < width; ++x) {
      const i = (y * width + x) * 4;

      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      const a = img.data[i + 3];

      matrix[y][x] =
        (r & 0xff) +
        ((g & 0xff) << 8) +
        ((b & 0xff) << 16) +
        ((a & 0xff) << 24);
    }
  }
  return matrix;
};

const matrixToImage = (matrix: number[][], width: number, height: number) => {
  const img = new ImageData(width, height);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const i = (y * width + x) * 4;

      img.data[i] = matrix[y][x] & 0xff;
      img.data[i + 1] = (matrix[y][x] >> 8) & 0xff;
      img.data[i + 2] = (matrix[y][x] >> 16) & 0xff;
      img.data[i + 3] = (matrix[y][x] >> 24) & 0xff;
      img.data[i + 3] = 255;
    }
  }
  return img;
};

const fileToImage = (file: File) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const SeamCarving = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<number[][]>([]);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [realWidth, setRealWidth] = useState(0);
  const [seamsToRemove, setSeamsToRemove] = useState<number>(0);

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

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (image === undefined) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas === null || ctx === null) {
      return;
    }

    const img = await fileToImage(image);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const matrix = imageDataToMatrix(imageData);
    setWidth(matrix[0].length);
    setHeight(matrix.length);
    setRealWidth(matrix[0].length);
    setSeamsToRemove(0);
    setImage(matrix);
  };

  useEffect(() => {
    const carve = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas === null || ctx === null) {
        return;
      }
      if (image.length === 0) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const imageCopy = copyMatrix(image);
      const d = seamCarve(imageCopy, seamsToRemove);

      const carved = d.img;
      canvas.width = d.width;
      ctx.putImageData(
        matrixToImage(carved, carved[0].length, carved.length),
        0,
        0,
      );
      setRealWidth(d.width);
    };

    carve();
  }, [image, seamsToRemove]);

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        <div>
          <Label htmlFor="image">Image</Label>
          <Input id="image" type="file" onChange={onImageChange} />
        </div>

        <div>
          <Label htmlFor="seams-to-remove">Seams to remove</Label>
          <Input
            id="seams-to-remove"
            type="number"
            value={seamsToRemove}
            onChange={(e) =>
              setSeamsToRemove(Math.min(Number(e.target.value), width))
            }
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto my-2">
        <p className="text-sm text-slate-400">
          Image dimensions: {width}x{height}
        </p>
        <p className="text-sm text-slate-400">
          Real image dimensions: {realWidth}x{height}
        </p>
      </div>

      <div className="max-w-3xl mx-auto my-2">
        <div className="overflow-hidden rounded-lg border-[1px] border-slate-400">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="mx-auto"
          ></canvas>
        </div>
      </div>
    </div>
  );
};
