/** 아이템(전리품). 획득 시 소유 장수의 능력치를 영구히 올린다. */
export interface Item {
  /** 안정적 식별자 (예: "sword_qinggang") */
  id: string;
  /** 표시명 (청강검) */
  name: string;
  /** 종류 */
  type: 'sword' | 'book' | 'treasure';
  /** 보정 대상 능력치 */
  stat: 'war' | 'int' | 'cha';
  /** 상승치 */
  bonus: number;
}
