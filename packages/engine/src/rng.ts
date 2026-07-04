import type { RngState } from '@sam2/shared';

/**
 * 결정론 난수 (mulberry32). seed+counter만으로 재현 — 전역 Math.random 금지.
 * 상태(RngState)를 명시적으로 넘겨받아 새 상태와 함께 값을 반환한다(순수).
 */
export function createRng(seed: number): RngState {
  return { seed: seed >>> 0, counter: 0 };
}

/** [0,1) 난수와 다음 상태를 반환 (부수효과 없음) */
export function nextFloat(state: RngState): { value: number; next: RngState } {
  const counter = state.counter + 1;
  let t = (state.seed + counter * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, next: { seed: state.seed, counter } };
}

/** [min,max] 정수 */
export function nextInt(
  state: RngState,
  min: number,
  max: number,
): { value: number; next: RngState } {
  const { value, next } = nextFloat(state);
  return { value: min + Math.floor(value * (max - min + 1)), next };
}
