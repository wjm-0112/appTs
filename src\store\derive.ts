import type { AppRecord, ChecklistItem, MaterialItem, MarketTrack, PersistState, AppStats, StageProgress, MaterialDef } from '../types';
import { MATERIAL_DEFS, getMaterialDef } from '../constants/materialCatalog';
import { SELFCHECK_DEFS } from '../constants/selfcheck';
import { MARKET_DEFS, getMarket } from '../constants/markets';
import { STAGES } from '../constants/stages';
import { getIndustry } from '../constants/industries';

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** 按品类生成模板快照：基础材料（含非可选行业项）+ 自查 32 项 + 六市场初始态 */
export function snapshotTemplates(industryId: string): {
  materials: MaterialItem[];
  checklist: ChecklistItem[];
  markets: MarketTrack[];
} {
  const industry = getIndustry(industryId);
  const extra = new Set(industry.extraMaterialIds);
  const materials: MaterialItem[] = MATERIAL_DEFS.filter((d) => !d.optional || extra.has(d.id)).map((d) => ({
    defId: d.id,
    status: 'not_started',
    files: [],
    updatedAt: nowIso()
  }));
  for (const id of industry.extraMaterialIds) {
    if (!materials.some((m) => m.defId === id)) {
      materials.push({ defId: id, status: 'not_started', files: [], updatedAt: nowIso() });
    }
  }
  const checklist: ChecklistItem[] = SELFCHECK_DEFS.map((d) => ({
    defId: d.id,
    pass: null,
    na: false,
    updatedAt: nowIso()
  }));
  const markets: MarketTrack[] = MARKET_DEFS.map((m) => ({
    marketId: m.id,
    account: 'none',
    submit: 'none',
    versionLog: []
  }));
  return { materials, checklist, markets };
}

export function createApp(input: {
  name: string;
  packageName: string;
  industryId: string;
  entityName?: string;
}): AppRecord {
  const t = snapshotTemplates(input.industryId);
  const at = nowIso();
  return {
    id: uid(),
    name: input.name.trim(),
    packageName: input.packageName.trim(),
    industryId: input.industryId,
    entity: { name: input.entityName?.trim() || undefined },
    certNo: {},
    materials: t.materials,
    checklist: t.checklist,
    markets: t.markets,
    notes: [],
    createdAt: at,
    updatedAt: at
  };
}

/** reconcile：模板升级「只增不改」——补入当前目录新增的 defId */
export function reconcileApp(app: AppRecord): AppRecord {
  const industry = getIndustry(app.industryId);
  const needMat = new Set<string>();
  for (const d of MATERIAL_DEFS) {
    if (!d.optional || industry.extraMaterialIds.includes(d.id)) needMat.add(d.id);
  }
  for (const id of industry.extraMaterialIds) needMat.add(id);
  const haveMat = new Set(app.materials.map((m) => m.defId));
  const extraMats: MaterialItem[] = [];
  for (const id of needMat) {
    if (!haveMat.has(id) && getMaterialDef(id)) {
      extraMats.push({ defId: id, status: 'not_started', files: [], updatedAt: nowIso() });
    }
  }
  const haveCheck = new Set(app.checklist.map((c) => c.defId));
  const extraChecks: ChecklistItem[] = SELFCHECK_DEFS.filter((d) => !haveCheck.has(d.id)).map((d) => ({
    defId: d.id,
    pass: null,
    na: false,
    updatedAt: nowIso()
  }));
  if (extraMats.length === 0 && extraChecks.length === 0) return app;
  return {
    ...app,
    materials: [...app.materials, ...extraMats],
    checklist: [...app.checklist, ...extraChecks]
  };
}

export function reconcileState(state: PersistState): PersistState {
  return { ...state, apps: state.apps.map(reconcileApp) };
}

// ===== 派生统计 =====

const QUAL_CATS = new Set(['主体', '知产', '备案']);

/** 材料编号 → 概览证照汇总字段 的同步映射（材料台账与批量补号共用） */
export const CERT_FIELD_BY_DEF: Record<string, keyof AppRecord['certNo']> = {
  ip_copyright: 'copyright',
  filing_icp: 'icp',
  filing_app: 'appIcp',
  filing_police: 'police'
};

/** 追加去重：versionLog 等列表用 */
export function appendUnique(list: string[], items: string[]): string[] {
  const set = new Set(list);
  const add: string[] = [];
  for (const it of items) {
    if (!it) continue;
    if (!set.has(it)) {
      set.add(it);
      add.push(it);
    }
  }
  return add.length ? [...list, ...add] : list;
}

function terminal(m: MaterialItem): boolean {
  return m.status === 'obtained' || m.status === 'uploaded';
}

function matRatio(
  items: MaterialItem[],
  filter: (def: MaterialDef) => boolean
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const m of items) {
    const def = getMaterialDef(m.defId);
    if (!def) continue;
    // 快照内可选项 = 行业必需项（非必需可选项本就不进入快照），一律计入分母
    if (!filter(def)) continue;
    total += 1;
    if (terminal(m)) done += 1;
  }
  return { done, total };
}

export function deriveStats(app: AppRecord): AppStats {
  const qual = matRatio(app.materials, (d) => QUAL_CATS.has(d.category) && d.stage === 'qual');
  const techMat = matRatio(app.materials, (d) => d.category === '包体');

  let techCheckDone = 0;
  let techCheckTotal = 0;
  let checkDone = 0;
  let checkTotal = 0;
  let checkNa = 0;
  for (const c of app.checklist) {
    const def = SELFCHECK_DEFS.find((s) => s.id === c.defId);
    if (!def) continue;
    if (c.na) {
      checkNa += 1;
      continue;
    }
    checkTotal += 1;
    const pass = c.pass === true;
    if (pass) checkDone += 1;
    if (def.group === '包体技术') {
      techCheckTotal += 1;
      if (pass) techCheckDone += 1;
    }
  }
  const certified = app.markets.filter((m) => m.account === 'certified').length;
  const passed = app.markets.filter((m) => m.submit === 'passed').length;
  const launched = app.markets.some((m) => !!m.launchAt);
  const submittedAny = app.markets.some((m) => m.submit !== 'none');
  const n = app.markets.length || 1;

  const accountRatio = certified / n;
  const reviewRatio = submittedAny ? passed / n : 0;
  const launchRatio = launched ? 1 : 0;
  const techDonePts = techMat.done + techCheckDone;
  const techTotalPts = techMat.total + techCheckTotal;

  const stages: StageProgress[] = STAGES.map((s) => {
    if (s.id === 'qual')
      return { stageId: s.id, name: s.name, ratio: qual.total ? qual.done / qual.total : 1, done: qual.done, total: qual.total };
    if (s.id === 'account')
      return { stageId: s.id, name: s.name, ratio: accountRatio, done: certified, total: n };
    if (s.id === 'tech')
      return { stageId: s.id, name: s.name, ratio: techTotalPts ? techDonePts / techTotalPts : 1, done: techDonePts, total: techTotalPts };
    if (s.id === 'review')
      return { stageId: s.id, name: s.name, ratio: reviewRatio, done: passed, total: n };
    return { stageId: s.id, name: s.name, ratio: launchRatio, done: launched ? 1 : 0, total: 1 };
  });

  const incompleteIdx = stages.findIndex((st) => st.ratio < 1);
  const currentStage = incompleteIdx >= 0 ? STAGES[incompleteIdx] : STAGES[STAGES.length - 1];

  const completion = Math.round((stages.reduce((acc, s) => acc + s.ratio, 0) / stages.length) * 100);

  return {
    stages,
    currentStage,
    materialDone: app.materials.filter(terminal).length,
    materialTotal: app.materials.length,
    checkDone,
    checkTotal,
    checkNa,
    marketPassed: passed,
    marketTotal: n,
    completion,
    launched
  };
}

/** 阶段缺口：当前阶段未完成的缺口明细，供步骤条/建议下一步提示 */
export function deriveGaps(app: AppRecord): string[] {
  const stats = deriveStats(app);
  const gaps: string[] = [];
  const stageId = stats.currentStage.id;
  if (stageId === 'qual') {
    for (const m of app.materials) {
      const def = getMaterialDef(m.defId);
      if (!def) continue;
      if (QUAL_CATS.has(def.category) && !terminal(m)) gaps.push(`材料：${def.name}`);
    }
  } else if (stageId === 'account') {
    for (const mk of app.markets) {
      if (mk.account !== 'certified') gaps.push(`账号：${getMarket(mk.marketId).name} 未认证`);
    }
  } else if (stageId === 'tech') {
    for (const m of app.materials) {
      const def = getMaterialDef(m.defId);
      if (def && def.category === '包体' && !terminal(m)) gaps.push(`材料：${def.name}`);
    }
    for (const c of app.checklist) {
      const def = SELFCHECK_DEFS.find((s) => s.id === c.defId);
      if (def && def.group === '包体技术' && !c.na && c.pass !== true) gaps.push(`自查：${def.text}`);
    }
  } else if (stageId === 'review') {
    for (const mk of app.markets) {
      const def = getMarket(mk.marketId);
      if (mk.submit === 'none') gaps.push(`提审：${def.name} 尚未提交`);
      else if (mk.submit === 'rejected') gaps.push(`提审：${def.name} 被驳回，待整改重提`);
    }
  } else {
    for (const mk of app.markets) {
      if (mk.submit === 'passed' && !mk.launchAt) gaps.push(`上架：${getMarket(mk.marketId).name} 已通过待发布`);
    }
  }
  return gaps;
}
