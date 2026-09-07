import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { App as AntApp } from 'antd';
import type {
  AppRecord,
  ChecklistItem,
  MarketTrack,
  MaterialItem,
  PersistState,
  Profile
} from '../types';
import {
  loadAppState,
  saveAppState,
  loadProfile,
  saveProfile,
  clearProfile as dbClearProfile,
  emptyState,
  emptyProfile,
  normalizeProfile,
  CURRENT_STATE_VERSION
} from '../data/db';
import { getMaterialDef } from '../constants/materialCatalog';
import { createApp, reconcileState, reconcileApp, uid, nowIso, CERT_FIELD_BY_DEF, appendUnique } from './derive';

export const SYNC_CHANNEL = 'app-submit-sync';
const SAVE_DEBOUNCE = 500;
const PROFILE_DEBOUNCE = 300;

export interface ProfilePatch {
  entity?: Partial<Profile['entity']>;
  defaults?: Partial<Profile['defaults']>;
}

export interface BulkMarketPatch {
  testAccount?: string;
  lastSubmitAt?: string;
  versionLogAppend?: string[];
}

interface AppContextValue {
  ready: boolean;
  storageDisabled: boolean;
  lastSavedAt: string | null;
  state: PersistState;
  apps: AppRecord[];
  profile: Profile;
  addApp: (input: { name: string; packageName: string; industryId: string; entityName?: string }) => AppRecord;
  updateAppInfo: (
    id: string,
    patch: Partial<Pick<AppRecord, 'name' | 'packageName' | 'industryId'>> & { entityName?: string }
  ) => void;
  setCertNo: (id: string, patch: Partial<AppRecord['certNo']>) => void;
  removeApp: (id: string) => void;
  setMaterial: (appId: string, defId: string, patch: Partial<MaterialItem>) => void;
  setCheck: (appId: string, defId: string, patch: Partial<ChecklistItem>) => void;
  setMarket: (appId: string, marketId: string, patch: Partial<MarketTrack>) => void;
  addNote: (appId: string, text: string, type?: string) => void;
  removeNote: (appId: string, noteId: string) => void;
  importAll: (next: PersistState) => void;
  resetAll: () => void;
  flushNow: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => void;
  clearProfile: () => void;
  bulkSetMaterials: (
    appId: string,
    defIds: string[],
    patch: Partial<Pick<MaterialItem, 'status' | 'note'>>
  ) => void;
  bulkNumberMaterials: (appId: string, defIds: string[], prefix: string, start: number) => void;
  bulkSetMarkets: (appId: string, marketIds: string[], patch: BulkMarketPatch) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { message } = AntApp.useApp();
  const [state, setState] = useState<PersistState>(() => emptyState());
  const [profile, setProfile] = useState<Profile>(() => emptyProfile());
  const [ready, setReady] = useState(false);
  const [storageDisabled, setStorageDisabled] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const latestRef = useRef(state);
  latestRef.current = state;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const profileTimerRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const mountedRef = useRef(true);

  /** 立即落盘当前内存状态（有改动才广播，成功后清 dirty） */
  const persistNow = async (): Promise<void> => {
    const hadDirty = dirtyRef.current;
    dirtyRef.current = false;
    const s = latestRef.current;
    try {
      await saveAppState(s);
      if (!mountedRef.current) return;
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      if (hadDirty) {
        try {
          channelRef.current?.postMessage({ type: 'saved' });
        } catch {
          /* noop */
        }
      }
    } catch {
      dirtyRef.current = dirtyRef.current || hadDirty;
      if (!mountedRef.current) return;
      setStorageDisabled(true);
      message.error('保存失败：浏览器存储不可用，请尽快导出备份');
    }
  };

  const flushNow = () => persistNow();

  const scheduleSave = () => {
    dirtyRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void persistNow();
    }, SAVE_DEBOUNCE);
  };

  const flushProfile = () => {
    if (profileTimerRef.current !== null) {
      window.clearTimeout(profileTimerRef.current);
      profileTimerRef.current = null;
    }
    const p = profileRef.current;
    void saveProfile(p).catch(() => {
      if (mountedRef.current) setStorageDisabled(true);
    });
  };

  const scheduleProfileSave = () => {
    if (profileTimerRef.current !== null) window.clearTimeout(profileTimerRef.current);
    profileTimerRef.current = window.setTimeout(flushProfile, PROFILE_DEBOUNCE);
  };

  const commit = (next: PersistState) => {
    const withTs: PersistState = { ...next, savedAt: new Date().toISOString() };
    setState(withTs);
    latestRef.current = withTs;
    scheduleSave();
  };

  /** 从库重读并应用（只读同步，不 flush、不回发） */
  const applyFromDb = async () => {
    try {
      const [s, p] = await Promise.all([loadAppState(), loadProfile()]);
      if (!mountedRef.current) return;
      const r = reconcileState(s);
      setState(r);
      latestRef.current = r;
      setProfile(p);
      profileRef.current = p;
      dirtyRef.current = false;
      setLastSavedAt(r.savedAt ? new Date(r.savedAt).toLocaleTimeString('zh-CN', { hour12: false }) : null);
    } catch {
      /* noop */
    }
  };

  // 初始加载
  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      try {
        const [s, p] = await Promise.all([loadAppState(), loadProfile()]);
        if (!mountedRef.current) return;
        const reconciled = reconcileState(s);
        const changed =
          reconciled.apps.length !== s.apps.length ||
          reconciled.apps.some((a, i) => {
            const old = s.apps[i];
            return !old || a.materials.length !== old.materials.length || a.checklist.length !== old.checklist.length;
          });
        setState(reconciled);
        latestRef.current = reconciled;
        setProfile(p);
        profileRef.current = p;
        dirtyRef.current = false;
        setLastSavedAt(reconciled.savedAt ? new Date(reconciled.savedAt).toLocaleTimeString('zh-CN', { hour12: false }) : null);
        if (changed) await saveAppState(reconciled);
      } catch {
        if (mountedRef.current) {
          setStorageDisabled(true);
          setState(emptyState());
        }
      } finally {
        if (mountedRef.current) setReady(true);
      }
    })();

    // 多标签：收到广播仅当本地无未保存改动时重读（不 flush、不回发，防乒乓）
    const onRemote = () => {
      if (!dirtyRef.current) void applyFromDb();
    };
    try {
      const bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.onmessage = onRemote;
      channelRef.current = bc;
    } catch {
      channelRef.current = null;
    }

    const onVis = () => {
      if (document.visibilityState === 'visible' && !dirtyRef.current) void applyFromDb();
    };
    document.addEventListener('visibilitychange', onVis);
    const onHide = () => {
      if (dirtyRef.current) void persistNow();
      flushProfile();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);

    return () => {
      mountedRef.current = false;
      if (dirtyRef.current) void persistNow();
      flushProfile();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      try {
        channelRef.current?.close();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== actions =====
  const value = useMemo<AppContextValue>(() => {
    const mutateApp = (id: string, fn: (a: AppRecord) => AppRecord) => {
      const next: PersistState = {
        ...latestRef.current,
        apps: latestRef.current.apps.map((a) => (a.id === id ? { ...fn(a), updatedAt: nowIso() } : a))
      };
      commit(next);
    };

    return {
      ready,
      storageDisabled,
      lastSavedAt,
      state,
      apps: state.apps,
      profile,
      addApp: (input) => {
        const app = createApp(input);
        commit({ ...latestRef.current, apps: [...latestRef.current.apps, app] });
        return app;
      },
      updateAppInfo: (id, patch) =>
        mutateApp(id, (a) => {
          const next = {
            ...a,
            name: patch.name !== undefined ? patch.name.trim() || a.name : a.name,
            packageName: patch.packageName !== undefined ? patch.packageName.trim() || a.packageName : a.packageName,
            industryId: patch.industryId ?? a.industryId,
            entity: {
              ...a.entity,
              name: patch.entityName !== undefined ? patch.entityName.trim() || undefined : a.entity.name
            }
          };
          // 切换品类：同一 mutate 内即时按新品类补齐模板（只增不删）
          if (next.industryId !== a.industryId) return reconcileApp(next);
          return next;
        }),
      setCertNo: (id, patch) => mutateApp(id, (a) => ({ ...a, certNo: { ...a.certNo, ...patch } })),
      removeApp: (id) => {
        commit({ ...latestRef.current, apps: latestRef.current.apps.filter((a) => a.id !== id) });
      },
      setMaterial: (appId, defId, patch) =>
        mutateApp(appId, (a) => ({
          ...a,
          materials: a.materials.map((m) =>
            m.defId === defId ? { ...m, ...patch, files: patch.files ?? m.files, updatedAt: nowIso() } : m
          )
        })),
      setCheck: (appId, defId, patch) =>
        mutateApp(appId, (a) => ({
          ...a,
          checklist: a.checklist.map((c) =>
            c.defId === defId ? { ...c, ...patch, updatedAt: nowIso() } : c
          )
        })),
      setMarket: (appId, marketId, patch) =>
        mutateApp(appId, (a) => ({
          ...a,
          markets: a.markets.map((m) =>
            m.marketId === marketId ? { ...m, ...patch, versionLog: patch.versionLog ?? m.versionLog, updatedAt: nowIso() } : m
          )
        })),
      addNote: (appId, text, type = 'node') =>
        mutateApp(appId, (a) => ({
          ...a,
          notes: [{ id: uid(), type, text, at: nowIso() }, ...a.notes]
        })),
      removeNote: (appId, noteId) =>
        mutateApp(appId, (a) => ({ ...a, notes: a.notes.filter((n) => n.id !== noteId) })),
      importAll: (next) => {
        const r = reconcileState(next);
        commit({ ...r, version: CURRENT_STATE_VERSION });
      },
      resetAll: () => commit(emptyState()),
      flushNow,

      // —— 主体档案 ——
      updateProfile: (patch) => {
        const nextP: Profile = normalizeProfile({
          entity: { ...profileRef.current.entity, ...(patch.entity ?? {}) },
          defaults: { ...profileRef.current.defaults, ...(patch.defaults ?? {}) }
        });
        setProfile(nextP);
        profileRef.current = nextP;
        scheduleProfileSave();
      },
      clearProfile: () => {
        const empty = emptyProfile();
        setProfile(empty);
        profileRef.current = empty;
        void dbClearProfile();
      },

      // —— 批量（单次 commit）——
      bulkSetMaterials: (appId, defIds, patch) => {
        const set = new Set(defIds);
        if (set.size === 0) return;
        mutateApp(appId, (a) => ({
          ...a,
          materials: a.materials.map((m) => {
            if (!set.has(m.defId)) return m;
            if (patch.status !== undefined && patch.status === 'rejected') return m; // 驳回原因不走批量
            return { ...m, ...patch, files: m.files, updatedAt: nowIso() };
          })
        }));
      },
      bulkNumberMaterials: (appId, defIds, prefix, start) => {
        const ids = defIds.filter((d) => getMaterialDef(d)?.needCertNo);
        if (ids.length === 0) return;
        const set = new Set(ids);
        let seq = start;
        const certPatch: Partial<AppRecord['certNo']> = {};
        mutateApp(appId, (a) => ({
          ...a,
          materials: a.materials.map((m) => {
            if (!set.has(m.defId)) return m;
            const def = getMaterialDef(m.defId);
            if (!def?.needCertNo) return m;
            if (m.certNo) return m; // 跳过已填
            const value = `${prefix}${seq}`;
            seq += 1;
            const field = CERT_FIELD_BY_DEF[m.defId];
            if (field) certPatch[field] = value;
            return { ...m, certNo: value, updatedAt: nowIso() };
          }),
          certNo: { ...a.certNo, ...certPatch }
        }));
      },
      bulkSetMarkets: (appId, marketIds, patch) => {
        const set = new Set(marketIds);
        if (set.size === 0) return;
        mutateApp(appId, (a) => ({
          ...a,
          markets: a.markets.map((m) => {
            if (!set.has(m.marketId)) return m;
            return {
              ...m,
              testAccount: patch.testAccount !== undefined ? patch.testAccount : m.testAccount,
              lastSubmitAt: patch.lastSubmitAt !== undefined ? patch.lastSubmitAt : m.lastSubmitAt,
              versionLog:
                patch.versionLogAppend && patch.versionLogAppend.length
                  ? appendUnique(m.versionLog, patch.versionLogAppend)
                  : m.versionLog
            };
          })
        }));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storageDisabled, lastSavedAt, state, profile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
