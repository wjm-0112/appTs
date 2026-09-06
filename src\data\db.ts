import { openDB, type IDBPDatabase } from 'idb';
import type { PersistState, Profile } from '../types';

export const DB_NAME = 'app-submit-db';
export const STORE = 'kv';
/** 存储结构版本：仅当 object store 结构变化才升级 */
export const DB_VERSION = 1;
export const STATE_KEY = 'appState';
/** 数据形态版本：字段变化走 MIGRATIONS 迁移 */
export const CURRENT_STATE_VERSION = 1;

export interface KVDoc {
  k: string;
  v: unknown;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function openDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'k' });
        }
      }
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** 写队列：串行化所有写操作，防止并发覆盖 */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

async function getDoc(key: string): Promise<KVDoc | undefined> {
  const db = await openDb();
  return db.get(STORE, key) as Promise<KVDoc | undefined>;
}

/** 读取并解包存储对象：存入时为 { k, v: 数据 }，此处返回 v */
async function getValue<T>(key: string): Promise<T | undefined> {
  const doc = await getDoc(key);
  return doc ? (doc.v as T) : undefined;
}

async function putRaw(key: string, value: unknown): Promise<void> {
  await enqueue(async () => {
    const db = await openDb();
    await db.put(STORE, { k: key, v: value } as KVDoc);
  });
}

async function delRaw(key: string): Promise<void> {
  await enqueue(async () => {
    const db = await openDb();
    await db.delete(STORE, key);
  });
}

/** 数据迁移链：Record<fromVersion, (old) => next> */
export const MIGRATIONS: Record<number, (old: PersistState) => PersistState> = {};

export function emptyState(): PersistState {
  return { version: CURRENT_STATE_VERSION, savedAt: '', apps: [] };
}

function migrate(raw: PersistState): { state: PersistState; changed: boolean } {
  let state = { ...raw, apps: raw.apps ?? [] };
  let v = raw.version ?? 0;
  let changed = v !== CURRENT_STATE_VERSION;
  while (v < CURRENT_STATE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break;
    state = step(state);
    v += 1;
  }
  if (v !== CURRENT_STATE_VERSION) changed = true;
  return { state: { ...state, version: CURRENT_STATE_VERSION }, changed };
}

/** 读取：无记录→空集；有→迁移后回写 */
export async function loadAppState(): Promise<PersistState> {
  const raw = await getValue<PersistState>(STATE_KEY);
  if (!raw) return emptyState();
  const { state, changed } = migrate(raw);
  if (changed) await saveAppState(state);
  return state;
}

/** 保存：原子整包写入；失败抛出由调用方兜底 */
export async function saveAppState(state: PersistState): Promise<void> {
  await putRaw(STATE_KEY, { ...state, savedAt: new Date().toISOString() });
}

/** 快照内容：appState + 可选档案（旧快照为纯 appState，读取端兼容） */
export interface SnapshotPayload {
  state: PersistState;
  profile?: Profile;
  savedAt: string;
}

function readSnapshot(value: unknown): { state: PersistState; profile?: Profile } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  // 新格式
  if (v.state && typeof v.state === 'object' && Array.isArray((v.state as PersistState).apps)) {
    return { state: v.state as PersistState, profile: v.profile as Profile | undefined };
  }
  // 旧格式：顶层即 appState
  if (typeof v.version === 'number' && Array.isArray(v.apps)) {
    return { state: value as unknown as PersistState };
  }
  return null;
}

/** 快照备份：当前态 + 档案 → backup-<ts>，并保留最近 5 份 */
export async function backupSnapshot(): Promise<string> {
  const [state, profile] = await Promise.all([loadAppState(), loadProfile()]);
  const payload: SnapshotPayload = {
    state,
    savedAt: new Date().toISOString(),
    ...(profileHasAny(profile) ? { profile } : {})
  };
  const key = `backup-${Date.now()}`;
  await putRaw(key, payload);
  await pruneBackups(5);
  return key;
}

async function listRawKeys(prefix: string): Promise<string[]> {
  const db = await openDb();
  const keys = await db.getAllKeys(STORE);
  return keys.filter((k): k is string => typeof k === 'string' && k.startsWith(prefix));
}

export async function listBackups(): Promise<{ key: string; at: string; count: number }[]> {
  const keys = (await listRawKeys('backup-')).sort((a, b) => b.localeCompare(a));
  const out: { key: string; at: string; count: number }[] = [];
  for (const key of keys) {
    const snap = readSnapshot(await getValue<unknown>(key));
    if (snap) {
      out.push({ key, at: new Date(Number(key.slice(7))).toLocaleString(), count: snap.state.apps.length });
    }
  }
  return out;
}

async function pruneBackups(keep: number): Promise<void> {
  const keys = (await listRawKeys('backup-')).sort((a, b) => b.localeCompare(a));
  for (const key of keys.slice(keep)) await delRaw(key);
}

/** 恢复某份备份为当前态（含档案；不删除备份本身） */
export async function restoreBackup(key: string): Promise<PersistState | null> {
  const snap = readSnapshot(await getValue<unknown>(key));
  if (!snap) return null;
  const { state } = migrate(snap.state);
  await saveAppState(state);
  if (snap.profile) await saveProfile(normalizeProfile(snap.profile));
  return state;
}

export async function deleteBackup(key: string): Promise<void> {
  await delRaw(key);
}

// ===== 全局主体档案（独立键，不属于 appState，无版本迁移）=====

export const PROFILE_KEY = 'profile';

export function emptyProfile(): Profile {
  return { entity: {}, defaults: { industryId: 'tool' } };
}

export function normalizeProfile(raw: unknown): Profile {
  const base = emptyProfile();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Profile>;
  return {
    entity: {
      name: typeof r.entity?.name === 'string' ? r.entity.name : undefined,
      legalPerson: typeof r.entity?.legalPerson === 'string' ? r.entity.legalPerson : undefined,
      bank: typeof r.entity?.bank === 'string' ? r.entity.bank : undefined
    },
    defaults: {
      privacyUrl: typeof r.defaults?.privacyUrl === 'string' ? r.defaults.privacyUrl : undefined,
      testAccount: typeof r.defaults?.testAccount === 'string' ? r.defaults.testAccount : undefined,
      industryId: typeof r.defaults?.industryId === 'string' ? r.defaults.industryId : 'tool'
    }
  };
}

export function profileHasAny(p: Profile): boolean {
  return Boolean(p.entity.name || p.entity.legalPerson || p.entity.bank || p.defaults.privacyUrl || p.defaults.testAccount || p.defaults.industryId);
}

export async function loadProfile(): Promise<Profile> {
  const raw = await getValue<Profile>(PROFILE_KEY);
  return normalizeProfile(raw);
}

export async function saveProfile(p: Profile): Promise<void> {
  await putRaw(PROFILE_KEY, normalizeProfile(p));
}

export async function clearProfile(): Promise<void> {
  await delRaw(PROFILE_KEY);
}

/** 导出 JSON 字符串（appState + 可选 profile） */
export async function exportJson(): Promise<string> {
  const state = await loadAppState();
  const profile = await loadProfile();
  const payload: Record<string, unknown> = { ...state, savedAt: new Date().toISOString() };
  if (profileHasAny(profile)) payload.profile = profile;
  return JSON.stringify(payload, null, 2);
}

/** schema 强校验（轻量）：确保结构可用，返回错误信息或 null */
export function validateState(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return '文件内容不是有效对象';
  const s = raw as Record<string, unknown>;
  if (typeof s.version !== 'number') return '缺少 version 字段';
  if (!Array.isArray(s.apps)) return '缺少 apps 数组';
  for (const app of s.apps as Record<string, unknown>[]) {
    if (!app || typeof app !== 'object') return 'apps 中存在非法条目';
    if (typeof app.id !== 'string' || typeof app.name !== 'string' || typeof app.packageName !== 'string') {
      return 'App 缺少 id/name/packageName 字段';
    }
  }
  return null;
}

/** 导入：校验 → 迁移 → 自动备份旧数据 → 写入；返回结果 */
export async function importJson(text: string): Promise<{ ok: boolean; count: number; backupKey?: string; error?: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, count: 0, error: 'JSON 解析失败，请确认选择的是本工具导出的备份文件' };
  }
  const err = validateState(parsed);
  if (err) return { ok: false, count: 0, error: `数据校验未通过：${err}` };
  const { state } = migrate(parsed as PersistState);
  const backupKey = await backupSnapshot();
  await saveAppState(state);
  // 兼容旧备份：仅当文件含 profile 才写入档案（无 profile 不动本机档案）
  const withProfile = parsed as PersistState & { profile?: unknown };
  if (withProfile.profile !== undefined) {
    await saveProfile(normalizeProfile(withProfile.profile));
  }
  return { ok: true, count: state.apps.length, backupKey };
}

/** 重置：仅清空 appState（备份与主体档案保留） */
export async function resetData(): Promise<void> {
  await delRaw(STATE_KEY);
}
