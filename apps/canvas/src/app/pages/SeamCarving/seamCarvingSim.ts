import { createMatrix, removeCell } from './matrix';

export type ImgMatrix = number[][];

const COLOR_MAX = 0xffffffff;

function rgbToLuminance(rgb: number) {
  const r = ((rgb >> (8 * 0)) & 0xff) / 255.0;
  const g = ((rgb >> (8 * 1)) & 0xff) / 255.0;
  const b = ((rgb >> (8 * 2)) & 0xff) / 255.0;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toLuminance(img: ImgMatrix, lum: ImgMatrix) {
  const height = img.length;
  const width = img[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      lum[y][x] = rgbToLuminance(img[y][x]);
    }
  }
}

function withinBounds(mat: ImgMatrix, x: number, y: number) {
  const height = mat.length;
  const width = mat[0].length;

  return 0 <= x && x < width && 0 <= y && y < height;
}

function sobelFilterAt(mat: ImgMatrix, cx: number, cy: number) {
  const gx = [
    [1.0, 0.0, -1.0],
    [2.0, 0.0, -2.0],
    [1.0, 0.0, -1.0],
  ];

  const gy = [
    [1.0, 2.0, 1.0],
    [0.0, 0.0, 0.0],
    [-1.0, -2.0, -1.0],
  ];

  let sx = 0.0;
  let sy = 0.0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;

      const c = withinBounds(mat, x, y) ? mat[y][x] : 0.0;
      sx += c * gx[dy + 1][dx + 1];
      sy += c * gy[dy + 1][dx + 1];
    }
  }

  return sx * sx + sy * sy;
}

function sobelFilter(mat: ImgMatrix, grad: ImgMatrix) {
  const height = mat.length;
  const width = mat[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grad[y][x] = sobelFilterAt(mat, x, y);
    }
  }
}

function gradToDp(grad: ImgMatrix, dp: ImgMatrix) {
  const height = grad.length;
  const width = grad[0].length;

  for (let x = 0; x < width; x++) {
    dp[0][x] = grad[0][x];
  }

  for (let y = 1; y < height; y++) {
    for (let cx = 0; cx < width; cx++) {
      let min = Number.MAX_VALUE;
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const value = 0 <= x && x < width ? dp[y - 1][x] : Number.MAX_VALUE;
        if (value < min) min = value;
      }

      dp[y][cx] = grad[y][cx] + min;
    }
  }
}

function computeSeam(dp: ImgMatrix, seam: number[]) {
  const height = dp.length;
  const width = dp[0].length;

  const y = height - 1;
  seam[y] = 0;

  for (let x = 1; x < width; x++) {
    if (dp[y][x] < dp[y][seam[y]]) {
      seam[y] = x;
    }
  }

  for (let y = height - 2; y >= 0; y--) {
    seam[y] = seam[y + 1];
    for (let dx = -1; dx <= 1; dx++) {
      const x = seam[y + 1] + dx;
      if (0 <= x && x < width && dp[y][x] < dp[y][seam[y]]) {
        seam[y] = x;
      }
    }
  }
}

function markSobelPatches(grad: ImgMatrix, seam: number[]) {
  const height = grad.length;

  for (let cy = 0; cy < height; cy++) {
    const cx = seam[cy];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (withinBounds(grad, y, x)) {
          grad[y][x] = COLOR_MAX;
        }
      }
    }
  }
}

export function seamCarve(img: number[][], seamsToRemove: number) {
  const height = img.length;
  let width = img[0].length;
  let lumWidth = width;
  let gradWidth = width;
  let dpWidth = width;

  const lum = createMatrix(width, height);
  const grad = createMatrix(width, height);
  const dp = createMatrix(width, height);

  toLuminance(img, lum);
  sobelFilter(lum, grad);

  const seam = new Array<number>(height);
  for (let i = 0; i < seamsToRemove; i++) {
    gradToDp(grad, dp);
    computeSeam(dp, seam);
    markSobelPatches(grad, seam);

    for (let y = 0; y < height; y++) {
      const x = seam[y];
      removeCell(img, y, x);
      removeCell(lum, y, x);
      removeCell(grad, y, x);
    }

    width -= 1;
    lumWidth -= 1;
    gradWidth -= 1;
    dpWidth -= 1;

    for (let y = 0; y < height; y++) {
      for (let x = seam[y]; x < gradWidth && grad[y][x] === COLOR_MAX; x++) {
        grad[y][x] = sobelFilterAt(lum, x, y);
      }

      for (let x = seam[y] - 1; x >= 0 && grad[y][x] === COLOR_MAX; x--) {
        grad[y][x] = sobelFilterAt(lum, x, y);
      }
    }
  }

  return { img, lum, grad, dp, width, lumWidth, gradWidth, dpWidth };
}
