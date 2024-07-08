export function createMatrix(width: number, height: number) {
  const mat = new Array<number[]>(height);

  for (let y = 0; y < height; ++y) {
    mat[y] = new Array<number>(width);
  }

  return mat;
}

export const copyMatrix = (mat: number[][]) => {
  const height = mat.length;
  const width = mat[0].length;

  const copy = createMatrix(width, height);

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      copy[y][x] = mat[y][x];
    }
  }

  return copy;
};

export function removeCell(img: number[][], row: number, column: number) {
  const width = img[0].length;

  for (let x = column; x < width - 1; ++x) {
    img[row][x] = img[row][x + 1];
  }
}
