export const DR = 1;
const A = 1.5;
export const MAX_TEMP = 6000;

export const getStartingState = (width: number, height: number) => {
  const xWidth = Math.trunc(width / DR);
  const yHeight = Math.trunc(height / DR);

  const state: number[][] = new Array(yHeight);
  for (let y = 0; y < yHeight; y++) {
    state[y] = new Array<number>(xWidth);
    for (let x = 0; x < xWidth; x++) {
      if (
        x > xWidth / 4 &&
        x < (3 * xWidth) / 4 &&
        y > yHeight / 4 &&
        y < (3 * yHeight) / 4 &&
        x % 2 === 0
      ) {
        state[y][x] = (Math.random() + 1) * MAX_TEMP;
        continue;
      }

      state[y][x] = MAX_TEMP / 10;
    }
  }
  return state;
};

const dTemp = (state: number[][], x: number, y: number) => {
  const self = state[y][x];

  const top = y > 0 ? state[y - 1][x] : self;
  const bottom = y < state.length - 1 ? state[y + 1][x] : self;

  const left = x > 0 ? state[y][x - 1] : self;
  const right = x < state[y].length - 1 ? state[y][x + 1] : self;

  return (A * (top + bottom + left + right - 4 * self)) / DR ** 2;
};

export const updateState = (
  state: number[][],
  nextState: number[][],
  dt: number
) => {
  for (let y = 0; y < state.length; y++) {
    for (let x = 0; x < state[y].length; x++) {
      nextState[y][x] = state[y][x] + dTemp(state, x, y) * dt;
    }
  }
};
