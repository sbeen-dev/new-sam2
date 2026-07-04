/** 군주(진영)별 색. scenario1 세력 + 중립. 표시용. */
export const FACTION_COLORS: Record<string, string> = {
  dong_zhuo: '#b23b3b',
  yuan_shao: '#3b6fb2',
  cao_cao: '#2f6f8f',
  gongsun_zan: '#8f6f2f',
  liu_bei: '#3b9e6f',
  sun_jian: '#c0392b',
  yuan_shu: '#7d5ba6',
  liu_biao: '#4b8f4b',
  tao_qian: '#b2853b',
  ma_teng: '#9e5b3b',
  liu_zhang: '#5b8fa6',
};

export const NEUTRAL_COLOR = '#4a4a52';

export function factionColor(lordId: string | null): string {
  if (!lordId) return NEUTRAL_COLOR;
  return FACTION_COLORS[lordId] ?? '#888';
}
