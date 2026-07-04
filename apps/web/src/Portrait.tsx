import type { Officer, OfficerStatus } from '@sam2/shared';
import { factionColor } from './faction';

/**
 * 절차적 초상(무초상 렌더 강화판). 원작 KOEI 초상화를 쓰지 않고, 장수의
 * 정적 속성(이름·능력치·연령·역할·진영)에서 결정론적으로 얼굴을 생성한다.
 * 같은 장수 → 항상 같은 그림(재현성). 후속에 실제 아트로 교체 가능.
 */

/** 문자열 → 안정적 해시(결정론) */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKIN = ['#e6b98f', '#d9a878', '#c9976a', '#e8c39e', '#d0a074'];
const CLOTH = ['#2c3a4a', '#3a2c2c', '#2c3a2c', '#3a3320', '#33263a'];

export function Portrait({
  officer,
  lordId,
  age,
  status,
  size = 34,
}: {
  officer: Officer;
  lordId: string | null;
  age: number;
  status: OfficerStatus;
  size?: number;
}) {
  const h = hash(officer.id);
  const faction = factionColor(lordId);
  const skin = SKIN[h % SKIN.length]!;
  const cloth = CLOTH[(h >> 3) % CLOTH.length]!;
  const senior = age >= 55;
  const young = age > 0 && age < 24;
  const hairColor = senior ? '#c9c6bf' : (h >> 5) % 3 === 0 ? '#3a3330' : '#22201e';

  // 역할별 관모: 군주=관, 무장(무력↑)=투구, 문관(지력↑)=문사건, 그 외 두건
  const headgear: 'crown' | 'helmet' | 'scholar' | 'cloth' =
    status === 'lord'
      ? 'crown'
      : officer.war >= 85
        ? 'helmet'
        : officer.int >= 82
          ? 'scholar'
          : 'cloth';

  // 눈썹 각도(무력 높을수록 사나운 인상)
  const brow = Math.min(6, Math.round(officer.war / 18));
  const beard = young ? 0 : senior ? 12 : 7 + ((h >> 7) % 5);

  const id = `pg-${officer.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="portrait" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={faction} stopOpacity="0.55" />
          <stop offset="1" stopColor="#14141a" stopOpacity="0.95" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <rect x="0" y="0" width="100" height="100" rx="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
        {/* 어깨/의복 */}
        <path d="M14 100 Q20 70 50 68 Q80 70 86 100 Z" fill={cloth} />
        <path d="M42 72 L58 72 L54 84 L46 84 Z" fill={skin} opacity="0.9" />
        {/* 머리 뒤 머리카락 */}
        <ellipse cx="50" cy="44" rx="24" ry="26" fill={hairColor} />
        {/* 얼굴 */}
        <ellipse cx="50" cy="46" rx="19" ry="22" fill={skin} />
        {/* 수염 */}
        {beard > 0 && (
          <path
            d={`M33 52 Q50 ${60 + beard} 67 52 Q60 ${66 + beard} 50 ${68 + beard} Q40 ${66 + beard} 33 52 Z`}
            fill={hairColor}
          />
        )}
        {/* 눈 */}
        <circle cx="42" cy="46" r="2.1" fill="#1a1a1a" />
        <circle cx="58" cy="46" r="2.1" fill="#1a1a1a" />
        {/* 눈썹 */}
        <path
          d={`M37 ${40} l9 ${-brow * 0.4 + 1}`}
          stroke="#1a1a1a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d={`M63 ${40} l-9 ${-brow * 0.4 + 1}`}
          stroke="#1a1a1a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* 입 */}
        <path
          d="M45 56 Q50 58 55 56"
          stroke="#7a4a3a"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* 관모 */}
        {headgear === 'crown' && (
          <g>
            <rect x="30" y="20" width="40" height="9" rx="2" fill="#c9a24a" />
            <rect x="44" y="12" width="12" height="10" fill="#c9a24a" />
            <circle cx="50" cy="12" r="3" fill="#e7d27a" />
          </g>
        )}
        {headgear === 'helmet' && (
          <g>
            <path d="M28 34 Q50 8 72 34 Q60 26 50 26 Q40 26 28 34 Z" fill="#8a8f96" />
            <rect x="47" y="8" width="6" height="14" fill="#b23b3b" />
            <path d="M28 34 Q50 24 72 34 L72 30 Q50 20 28 30 Z" fill="#6f747b" />
          </g>
        )}
        {headgear === 'scholar' && (
          <path d="M30 30 Q50 16 70 30 L70 34 Q50 26 30 34 Z" fill="#2a2a33" />
        )}
        {headgear === 'cloth' && <path d="M30 32 Q50 18 70 32 Q50 26 30 32 Z" fill={cloth} />}
      </g>
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx="14"
        fill="none"
        stroke={faction}
        strokeWidth="3"
      />
    </svg>
  );
}

/** 능력치 기반 한줄 호칭 */
export function officerEpithet(o: Officer): string {
  if (o.int >= 92 && o.war < 60) return '명군사(名軍師)';
  if (o.war >= 95) return '천하무쌍(天下無雙)';
  if (o.war >= 85 && o.int >= 78) return '지용겸비(智勇兼備)';
  if (o.war >= 85) return '맹장(猛將)';
  if (o.int >= 85) return '지장(智將)';
  if (o.cha >= 90) return '인망가(人望家)';
  return '무장(武將)';
}
