/**
 * 절차적 오디오. 외부 음원(네트워크/저작권) 대신 Web Audio로 효과음·BGM을 합성한다.
 * 자체 완결(파일 없음). 사용자 제스처(버튼 클릭) 안에서 호출되어 자동재생 정책을 만족.
 */

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function ensureCtx(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 단일 톤(엔벨로프 포함) */
function tone(
  c: Ctx,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number,
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export type Sfx = 'click' | 'conquer' | 'battle' | 'defeat' | 'item';

let sfxOn = true;
export function setSfxEnabled(on: boolean): void {
  sfxOn = on;
}

export function sfx(name: Sfx): void {
  if (!sfxOn) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case 'click':
      tone(c, 660, t, 0.08, 'triangle', 0.12);
      break;
    case 'conquer':
      [523.25, 659.25, 783.99].forEach((f, i) => tone(c, f, t + i * 0.09, 0.35, 'sine', 0.16));
      break;
    case 'battle':
      tone(c, 130, t, 0.18, 'triangle', 0.25);
      tone(c, 90, t, 0.22, 'sine', 0.2);
      break;
    case 'defeat':
      [392, 311, 262].forEach((f, i) => tone(c, f, t + i * 0.14, 0.4, 'sine', 0.18));
      break;
    case 'item':
      [1046.5, 1318.5, 1568].forEach((f, i) => tone(c, f, t + i * 0.07, 0.3, 'sine', 0.12));
      break;
  }
}

/**
 * 앰비언트 BGM: 5음계(궁상각치우 느낌) 완만한 랜덤워크 + 저음 드론. 조용하고 은은하게.
 */
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let droneNodes: { osc: OscillatorNode; g: GainNode }[] = [];
let step = 0;

export function bgmPlaying(): boolean {
  return bgmTimer !== null;
}

export function startBgm(): void {
  const c = ensureCtx();
  if (!c || bgmTimer) return;
  // 저음 드론(2음)
  for (const f of [65.41, 98.0]) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.value = 0.04;
    osc.connect(g).connect(c.destination);
    osc.start();
    droneNodes.push({ osc, g });
  }
  const tick = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    // 완만한 인덱스 이동
    step = (step + 1 + (Math.floor(t) % 3)) % PENTA.length;
    tone(ctx, PENTA[step]!, t, 1.4, 'triangle', 0.06);
    if (step % 4 === 0) tone(ctx, PENTA[(step + 2) % PENTA.length]! / 2, t, 1.8, 'sine', 0.05);
  };
  tick();
  bgmTimer = setInterval(tick, 900);
}

export function stopBgm(): void {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  for (const n of droneNodes) {
    try {
      n.g.gain.exponentialRampToValueAtTime(0.0001, (ctx?.currentTime ?? 0) + 0.3);
      n.osc.stop((ctx?.currentTime ?? 0) + 0.35);
    } catch {
      /* already stopped */
    }
  }
  droneNodes = [];
}
