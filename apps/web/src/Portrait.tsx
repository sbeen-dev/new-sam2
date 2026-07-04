import type { Officer, OfficerStatus } from '@sam2/shared';
import { factionColor } from './faction';

/**
 * 절차적 초상(일러스트 고도화판). 원작 KOEI 초상화를 쓰지 않고, 장수의 정적 속성
 * (이름·능력치·연령·역할·진영)에서 결정론적으로 삽화풍 얼굴을 합성한다.
 * 음영 그라데이션·이목구비·머리모양·관모/투구·한푸 옷깃을 갖춘다.
 * 같은 장수 → 항상 같은 그림(재현성). 외부 아트/네트워크 없음.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 피부 톤(밝은면/어두운면 쌍)
const SKIN = [
  ['#f0c6a0', '#c99873'],
  ['#e8b98f', '#bf8a63'],
  ['#dcab7e', '#b07d56'],
  ['#f2cfab', '#cf9f78'],
];
const CLOTH = ['#33465a', '#42302f', '#31452f', '#453a24', '#3a2b45', '#2f3f45'];

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
  const [skinLight, skinDark] = SKIN[h % SKIN.length]!;
  const cloth = CLOTH[(h >> 3) % CLOTH.length]!;
  const senior = age >= 55;
  const young = age > 0 && age < 24;
  const hairDark = senior ? '#b9b6ae' : '#211f1d';
  const hairLight = senior ? '#d7d4cc' : (h >> 5) % 3 === 0 ? '#4a4038' : '#332e29';

  const headgear: 'crown' | 'helmet' | 'scholar' | 'cloth' =
    status === 'lord'
      ? 'crown'
      : officer.war >= 85
        ? 'helmet'
        : officer.int >= 82
          ? 'scholar'
          : 'cloth';

  const fierce = officer.war >= 82; // 사나운 인상
  const beard: 'none' | 'goatee' | 'full' | 'long' = young
    ? 'none'
    : senior
      ? 'long'
      : (h >> 7) % 2 === 0
        ? 'full'
        : 'goatee';

  const uid = `p-${officer.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="portrait" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={faction} stopOpacity="0.7" />
          <stop offset="0.6" stopColor={faction} stopOpacity="0.25" />
          <stop offset="1" stopColor="#12121a" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.42" r="0.7">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={`${uid}-skin`} x1="0.25" y1="0.15" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={skinLight} />
          <stop offset="1" stopColor={skinDark} />
        </linearGradient>
        <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairLight} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
        <clipPath id={`${uid}-c`}>
          <rect x="0" y="0" width="100" height="100" rx="14" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-c)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-bg)`} />

        {/* 어깨/포(袍) */}
        <path d="M8 100 Q14 72 34 66 L66 66 Q86 72 92 100 Z" fill={cloth} />
        <path d="M8 100 Q14 72 34 66 L40 70 Q22 78 16 100 Z" fill="#000" opacity="0.18" />
        {/* 한푸 교차 옷깃 */}
        <path d="M50 70 L34 100 L44 100 L52 78 Z" fill={faction} opacity="0.85" />
        <path d="M50 70 L66 100 L56 100 L48 78 Z" fill={faction} opacity="0.6" />
        {/* 목 */}
        <path d="M43 60 L57 60 L56 74 Q50 78 44 74 Z" fill={skinDark} />

        {/* 머리(뒤) */}
        <path
          d="M28 40 Q26 18 50 15 Q74 18 72 40 L72 52 Q72 30 50 28 Q28 30 28 52 Z"
          fill={`url(#${uid}-hair)`}
        />

        {/* 얼굴 */}
        <path
          d="M32 40 Q32 24 50 22 Q68 24 68 40 Q68 58 58 66 Q50 70 42 66 Q32 58 32 40 Z"
          fill={`url(#${uid}-skin)`}
        />
        {/* 귀 */}
        <ellipse cx="31.5" cy="45" rx="3.5" ry="5" fill={`url(#${uid}-skin)`} />
        <ellipse cx="68.5" cy="45" rx="3.5" ry="5" fill={`url(#${uid}-skin)`} />
        {/* 볼 음영 */}
        <ellipse cx="40" cy="52" rx="5" ry="7" fill={skinDark} opacity="0.25" />
        <ellipse cx="60" cy="52" rx="5" ry="7" fill={skinDark} opacity="0.25" />

        {/* 앞머리 */}
        <path d="M32 40 Q34 26 50 24 Q66 26 68 40 Q60 32 50 32 Q40 32 32 40 Z" fill={hairDark} />
        {/* 상투(topknot) */}
        {headgear !== 'helmet' && (
          <>
            <ellipse cx="50" cy="19" rx="5.5" ry="6" fill={`url(#${uid}-hair)`} />
            <rect x="45" y="20" width="10" height="3" rx="1.5" fill="#2a2a2a" />
          </>
        )}

        {/* 눈썹 */}
        <path
          d={`M38 41 Q43 ${fierce ? 38 : 39.5} 47 40`}
          stroke="#1c1712"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M62 41 Q57 ${fierce ? 38 : 39.5} 53 40`}
          stroke="#1c1712"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* 눈 */}
        <path d="M39 45 Q43 43 47 45 Q43 47.5 39 45 Z" fill="#fff" opacity="0.9" />
        <path d="M53 45 Q57 43 61 45 Q57 47.5 53 45 Z" fill="#fff" opacity="0.9" />
        <circle cx="43" cy="45.2" r="1.7" fill="#20140c" />
        <circle cx="57" cy="45.2" r="1.7" fill="#20140c" />
        {/* 코 */}
        <path
          d="M50 46 L48 54 Q50 56 52 54"
          stroke={skinDark}
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
        {/* 입 */}
        <path
          d={`M45 59 Q50 ${fierce ? 60 : 61.5} 55 59`}
          stroke="#8a4436"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />

        {/* 수염 */}
        {beard === 'goatee' && (
          <path d="M46 60 Q50 68 54 60 Q52 66 50 68 Q48 66 46 60 Z" fill={hairDark} />
        )}
        {beard === 'full' && (
          <path
            d="M38 56 Q40 70 50 72 Q60 70 62 56 Q58 64 50 65 Q42 64 38 56 Z"
            fill={`url(#${uid}-hair)`}
          />
        )}
        {beard === 'long' && (
          <path
            d="M37 55 Q38 78 50 86 Q62 78 63 55 Q58 66 50 67 Q42 66 37 55 Z"
            fill={`url(#${uid}-hair)`}
          />
        )}
        {/* 콧수염(성인) */}
        {beard !== 'none' && (
          <path
            d="M44 57 Q50 60 56 57"
            stroke={hairDark}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* 관모 */}
        {headgear === 'crown' && (
          <g>
            <path d="M32 30 Q50 14 68 30 L68 24 Q50 10 32 24 Z" fill="#c8a24a" />
            <rect x="44" y="8" width="12" height="12" rx="1.5" fill="#c8a24a" />
            <circle cx="50" cy="10" r="3.2" fill="#f0dd8a" />
            <rect x="30" y="29" width="40" height="4" rx="2" fill="#a98426" />
          </g>
        )}
        {headgear === 'helmet' && (
          <g>
            <path d="M28 36 Q50 6 72 36 Q62 26 50 25 Q38 26 28 36 Z" fill="#8b9099" />
            <path d="M28 36 Q50 22 72 36 L72 31 Q50 18 28 31 Z" fill="#6d727b" />
            <rect x="47" y="4" width="6" height="18" rx="2" fill="#b23b3b" />
            <path d="M30 34 L28 48 L33 46 L34 35 Z" fill="#6d727b" />
            <path d="M70 34 L72 48 L67 46 L66 35 Z" fill="#6d727b" />
          </g>
        )}
        {headgear === 'scholar' && (
          <g>
            <path d="M30 32 Q50 18 70 32 L70 27 Q50 20 30 27 Z" fill="#242430" />
            <rect x="46" y="18" width="8" height="9" rx="2" fill="#242430" />
          </g>
        )}
        {headgear === 'cloth' && <path d="M30 33 Q50 20 70 33 Q50 27 30 33 Z" fill={cloth} />}

        {/* 비네트 */}
        <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-vig)`} />
      </g>
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx="13"
        fill="none"
        stroke={faction}
        strokeWidth="2.5"
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
