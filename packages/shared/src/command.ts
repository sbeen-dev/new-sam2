/** 명령 종류 — docs/game-design/commands.md 분류와 1:1 */
export type CommandType =
  // 내정
  | 'develop'
  | 'floodControl'
  | 'commerce'
  | 'farm'
  // 군사
  | 'draft'
  | 'train'
  | 'buyArms'
  | 'trade'
  // 인사
  | 'recruit'
  | 'reward'
  | 'move'
  | 'search'
  // 계략
  | 'rumor'
  | 'sow'
  | 'bribe'
  // 외교
  | 'ally'
  | 'aid'
  // 포로 처리
  | 'recruitCaptive'
  | 'releaseCaptive'
  | 'executeCaptive'
  // 전쟁
  | 'invade';

/** 하나의 명령 = 한 장수의 그달 행동 1회 */
export interface Command {
  type: CommandType;
  /** 명령을 수행하는 장수 */
  actorOfficerId: string;
  /** 명령의 기준 도시 */
  cityId: string;
  /** 대상 도시/장수/금액 등 (명령별 스키마) */
  params: Record<string, unknown>;
}

/** 명령 적용 후 발생한 사건 */
export interface GameEvent {
  turn: number;
  kind: string;
  message: string;
  data?: Record<string, unknown>;
}
