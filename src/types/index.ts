// ===== 静态知识（代码内只读常量，随版本发布，不进数据库）=====

export interface IndustryDef {
  id: string;
  name: string;
  /** 该品类需要追加的行业资质材料 defId */
  extraMaterialIds: string[];
  /** 行业提示（标注「以官方最新要求为准」） */
  tips: string[];
}

export type MaterialCategory = '主体' | '知产' | '备案' | '包体' | '应用信息';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  /** qual=资质合规阶段 / tech=打包自检阶段 */
  stage: 'qual' | 'tech';
  desc?: string;
  needCertNo?: boolean;
  needUrl?: boolean;
  /** 哪些市场特别要求（差异角标用） */
  requiredMarkets?: string[];
  /** 按条件才需要（如非法人办理时），默认不纳入完成度分母 */
  optional?: boolean;
}

export interface ChecklistDef {
  id: string;
  group: string;
  text: string;
  /** 默认适用于全部市场；applies 限定个别市场 */
  applies?: string[];
}

export type StageId = 'qual' | 'account' | 'tech' | 'review' | 'launch';

export interface StageDef {
  id: StageId;
  name: string;
  hint: string;
  targetTab: string;
}

export type MarketId = 'hw' | 'xiaomi' | 'oppo' | 'vivo' | 'honor' | 'tencent';

export interface MarketDef {
  id: MarketId;
  name: string;
  /** 各市场政策要点（差异矩阵见 markets.ts DIFF_TOPICS） */
  policy: string[];
}

// ===== 用户数据（IndexedDB 持久化）=====

export type MaterialStatus = 'not_started' | 'processing' | 'obtained' | 'uploaded' | 'rejected';

export interface MaterialItem {
  defId: string;
  status: MaterialStatus;
  certNo?: string;
  url?: string;
  note?: string;
  /** 只存文件名，不存文件内容 */
  files: string[];
  updatedAt: string;
}

export interface ChecklistItem {
  defId: string;
  /** true=通过 false=未通过 null=未判定 */
  pass: boolean | null;
  na: boolean;
  note?: string;
  updatedAt: string;
}

export interface MarketTrack {
  marketId: MarketId;
  account: 'none' | 'reviewing' | 'certified';
  submit: 'none' | 'submitted' | 'reviewing' | 'passed' | 'rejected';
  testAccount?: string;
  rejectReason?: string;
  lastSubmitAt?: string;
  launchAt?: string;
  versionLog: string[];
}

export interface NoteLog {
  id: string;
  type: string;
  text: string;
  at: string;
}

export interface AppRecord {
  id: string;
  name: string;
  packageName: string;
  industryId: string;
  entity: { name?: string; legalPerson?: string; bank?: string };
  certNo: { copyright?: string; icp?: string; appIcp?: string; police?: string; report?: string };
  materials: MaterialItem[];
  checklist: ChecklistItem[];
  markets: MarketTrack[];
  notes: NoteLog[];
  createdAt: string;
  updatedAt: string;
}

export interface PersistState {
  version: number;
  savedAt: string;
  apps: AppRecord[];
}

/** 全局主体档案（独立 kv 键 'profile'，不占 appState，无版本迁移） */
export interface Profile {
  entity: { name?: string; legalPerson?: string; bank?: string };
  defaults: { privacyUrl?: string; testAccount?: string; industryId?: string };
}

export interface StageProgress {
  stageId: StageId;
  name: string;
  /** 0-1 完成度 */
  ratio: number;
  done: number;
  total: number;
}

export interface AppStats {
  stages: StageProgress[];
  /** 当前阶段（第一个 ratio<1） */
  currentStage: StageDef;
  materialDone: number;
  materialTotal: number;
  checkDone: number;
  checkTotal: number;
  checkNa: number;
  marketPassed: number;
  marketTotal: number;
  /** 综合完成度 0-100 */
  completion: number;
  launched: boolean;
}
