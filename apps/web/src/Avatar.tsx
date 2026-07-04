import { factionColor } from './faction';

/**
 * 절차적 초상(무초상 렌더). 원작 KOEI 초상화 대신 진영색 + 이름 첫 글자로 표현.
 * asset-strategy.md의 "데이터 기반 절차적 렌더" 시작점 — 후속에 아트로 교체.
 */
export function Avatar({
  name,
  lordId,
  size = 34,
  dim = false,
}: {
  name: string;
  lordId: string | null;
  size?: number;
  dim?: boolean;
}) {
  const bg = factionColor(lordId);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.44,
        opacity: dim ? 0.5 : 1,
      }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}
