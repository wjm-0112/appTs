import { useMemo, useState } from 'react';
import {
  App as AntApp,
  Button,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import {
  PlusOutlined,
  InfoCircleOutlined,
  ClearOutlined,
  NumberOutlined,
  CheckSquareOutlined
} from '@ant-design/icons';
import type { AppRecord, MaterialDef, MaterialItem, MaterialStatus } from '../types';
import { getMaterialDef, MARKET_NAME, MATERIAL_CATEGORIES } from '../constants/materialCatalog';
import { useApp } from '../store/AppContext';
import { CERT_FIELD_BY_DEF } from '../store/derive';

const STATUS_META: Record<MaterialStatus, string> = {
  not_started: '未开始',
  processing: '办理中',
  obtained: '已下证',
  uploaded: '已上传',
  rejected: '被驳回'
};

/** 批量快捷可置的状态（被驳回需单独走原因 Modal，不放批量） */
const BULK_STATUSES: MaterialStatus[] = ['processing', 'obtained', 'uploaded'];

interface Props {
  app: AppRecord;
  onSetMaterial: (defId: string, patch: Partial<MaterialItem>) => void;
  onSyncCert: (patch: Partial<AppRecord['certNo']>) => void;
}

export default function MaterialsBoard({ app, onSetMaterial, onSyncCert }: Props) {
  const { message: msg } = AntApp.useApp();
  const { bulkSetMaterials, bulkNumberMaterials } = useApp();
  const [cat, setCat] = useState<string>('全部');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<MaterialItem | null>(null);
  const [reason, setReason] = useState('');
  const [addFile, setAddFile] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState<Record<string, boolean>>({});
  const [numOpen, setNumOpen] = useState(false);
  const [numPrefix, setNumPrefix] = useState('');
  const [numStart, setNumStart] = useState(1);

  const items = useMemo(() => app.materials, [app.materials]);

  const byCategory = useMemo(() => {
    const groups: { category: string; rows: MaterialItem[] }[] = [];
    for (const c of MATERIAL_CATEGORIES) {
      const rows = items.filter((m) => {
        const def = getMaterialDef(m.defId);
        return def && def.category === c;
      });
      if (rows.length) groups.push({ category: c, rows });
    }
    return groups;
  }, [items]);

  const groups = cat === '全部' ? byCategory : byCategory.filter((g) => g.category === cat);
  const defOf = (m: MaterialItem): MaterialDef | undefined => getMaterialDef(m.defId);

  const toggle = (defId: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(defId)) next.delete(defId);
      else next.add(defId);
      return next;
    });
  };

  const groupSel = (rows: MaterialItem[]): boolean => {
    const ids = rows.map((r) => r.defId);
    return ids.length > 0 && ids.every((id) => sel.has(id));
  };

  const groupPartial = (rows: MaterialItem[]): boolean => {
    const n = rows.filter((r) => sel.has(r.defId)).length;
    return n > 0 && n < rows.length;
  };

  const toggleGroup = (rows: MaterialItem[]) => {
    setSel((prev) => {
      const next = new Set(prev);
      const all = groupSel(rows);
      for (const r of rows) {
        if (all) next.delete(r.defId);
        else next.add(r.defId);
      }
      return next;
    });
  };

  const clearSel = () => setSel(new Set());

  const bulkStatus = (status: MaterialStatus) => {
    if (sel.size === 0) return;
    bulkSetMaterials(app.id, [...sel], { status });
    msg.success(`已批量标记为「${STATUS_META[status]}」（${sel.size} 项）`);
    clearSel();
  };

  const bulkClearNote = () => {
    if (sel.size === 0) return;
    bulkSetMaterials(app.id, [...sel], { note: undefined });
    msg.success(`已清空 ${sel.size} 项备注`);
    clearSel();
  };

  const openNumber = () => {
    const can = [...sel].filter((d) => defOf(items.find((x) => x.defId === d) as MaterialItem)?.needCertNo).length;
    if (can === 0) {
      msg.warning('所选材料中没有需要证书编号的项目');
      return;
    }
    setNumPrefix('');
    setNumStart(1);
    setNumOpen(true);
  };

  const doNumber = () => {
    const prefix = numPrefix.trim();
    if (!prefix) {
      msg.warning('请填写编号前缀');
      return;
    }
    bulkNumberMaterials(app.id, [...sel], prefix, numStart || 1);
    msg.success(`已为未填编号项补号（前缀 ${prefix}）`);
    setNumOpen(false);
    clearSel();
  };

  const changeStatus = (m: MaterialItem, value: MaterialStatus) => {
    if (value === m.status) return;
    if (value === 'rejected') {
      setRejectTarget(m);
      setReason(m.note ?? '');
      return;
    }
    onSetMaterial(m.defId, { status: value });
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      msg.warning('请填写驳回原因');
      return;
    }
    onSetMaterial(rejectTarget.defId, { status: 'rejected', note: reason.trim() });
    setRejectTarget(null);
    setReason('');
  };

  const changeCert = (m: MaterialItem, value: string) => {
    onSetMaterial(m.defId, { certNo: value });
    const field = CERT_FIELD_BY_DEF[m.defId];
    if (field) onSyncCert({ [field]: value });
  };

  const addFileName = (defId: string) => {
    const name = (addFile[defId] ?? '').trim();
    if (!name) return;
    const m = items.find((x) => x.defId === defId);
    if (!m) return;
    if (m.files.includes(name)) {
      msg.warning('该文件名已存在');
      return;
    }
    onSetMaterial(defId, { files: [...m.files, name] });
    setAddFile((s) => ({ ...s, [defId]: '' }));
  };

  const removeFile = (defId: string, name: string) => {
    const m = items.find((x) => x.defId === defId);
    if (!m) return;
    onSetMaterial(defId, { files: m.files.filter((f) => f !== name) });
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <Segmented value={cat} onChange={(v) => setCat(v as string)} options={['全部', ...MATERIAL_CATEGORIES]} />
        <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>
          共 {items.length} 项 · 可多选批量操作
        </Typography.Text>
      </div>

      {sel.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 10,
            padding: '8px 12px',
            background: 'var(--chip-info-bg)',
            borderRadius: 8
          }}
        >
          <CheckSquareOutlined style={{ color: 'var(--chip-info-fg)' }} />
          <span style={{ fontSize: 13, color: 'var(--chip-info-fg)' }}>已选 {sel.size} 项</span>
          <Space size={4} wrap>
            {BULK_STATUSES.map((s) => (
              <Button key={s} size="small" onClick={() => bulkStatus(s)}>
                置为{STATUS_META[s]}
              </Button>
            ))}
            <Button size="small" icon={<ClearOutlined />} onClick={bulkClearNote}>
              清空备注
            </Button>
            <Button size="small" icon={<NumberOutlined />} onClick={openNumber}>
              批量补编号
            </Button>
            <Button size="small" type="text" onClick={clearSel}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      {groups.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>该分类暂无材料</div>}

      {groups.map((g) => {
        const done = g.rows.filter((m) => m.status === 'obtained' || m.status === 'uploaded').length;
        return (
          <div
            key={g.category}
            style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              <input
                type="checkbox"
                checked={groupSel(g.rows)}
                ref={(el) => {
                  if (el) el.indeterminate = groupPartial(g.rows);
                }}
                onChange={() => toggleGroup(g.rows)}
                aria-label={`全选 ${g.category}`}
                style={{ width: 15, height: 15, cursor: 'pointer' }}
              />
              {g.category}
              <span className="num" style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                {done}/{g.rows.length}
              </span>
            </div>

            {g.rows.map((m) => {
              const def = defOf(m);
              if (!def) return null;
              const terminal = m.status === 'obtained' || m.status === 'uploaded';
              return (
                <div
                  key={m.defId}
                  style={{
                    padding: '10px 12px',
                    borderTop: '0.5px solid var(--line-soft)',
                    background: sel.has(m.defId) ? 'rgba(46,107,230,0.05)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={sel.has(m.defId)}
                      onChange={() => toggle(m.defId)}
                      aria-label={`选择 ${def.name}`}
                      style={{ marginTop: 4, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{def.name}</span>
                        {def.optional && <Tag style={{ marginRight: 0 }}>按条件</Tag>}
                        {def.requiredMarkets && def.requiredMarkets.length > 0 && (
                          <Tooltip title={`以下市场要求：${def.requiredMarkets.map((r) => MARKET_NAME[r as keyof typeof MARKET_NAME]).join('、')}`}>
                            <Tag color="blue" style={{ marginRight: 0, cursor: 'help' }}>
                              市场要求
                            </Tag>
                          </Tooltip>
                        )}
                        {def.desc && (
                          <Tooltip title={def.desc}>
                            <InfoCircleOutlined style={{ color: 'var(--text-3)' }} />
                          </Tooltip>
                        )}
                        <div style={{ marginLeft: 'auto' }}>
                          <Select
                            size="small"
                            style={{ width: 104 }}
                            value={m.status}
                            onChange={(v) => changeStatus(m, v as MaterialStatus)}
                            options={Object.entries(STATUS_META).map(([value, label]) => ({ value, label }))}
                            aria-label={`${def.name} 状态`}
                          />
                        </div>
                      </div>

                      {(terminal || m.status === 'rejected' || m.status === 'processing') && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {def.needCertNo && (
                            <Input
                              size="small"
                              style={{ width: 200 }}
                              placeholder="证书 / 备案编号"
                              value={m.certNo ?? ''}
                              onChange={(e) => changeCert(m, e.target.value)}
                            />
                          )}
                          {def.needUrl && (
                            <Input
                              size="small"
                              style={{ width: 240 }}
                              placeholder="网页链接（隐私政策等）"
                              value={m.url ?? ''}
                              onChange={(e) => onSetMaterial(m.defId, { url: e.target.value })}
                            />
                          )}
                          <Input
                            size="small"
                            style={{ width: 180 }}
                            placeholder={m.status === 'rejected' ? '驳回原因' : '备注'}
                            value={m.note ?? ''}
                            onChange={(e) => onSetMaterial(m.defId, { note: e.target.value })}
                          />
                        </div>
                      )}

                      {m.files.length > 0 || showAdd[m.defId] ? (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {m.files.map((f) => (
                            <Tag key={f} closable onClose={() => removeFile(m.defId, f)} style={{ marginRight: 0 }}>
                              {f}
                            </Tag>
                          ))}
                          <Input
                            size="small"
                            style={{ width: 180 }}
                            placeholder="记录附件文件名"
                            value={addFile[m.defId] ?? ''}
                            onChange={(e) => setAddFile((s) => ({ ...s, [m.defId]: e.target.value }))}
                            onPressEnter={() => addFileName(m.defId)}
                          />
                          <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => addFileName(m.defId)} aria-label="添加文件名">
                            记入
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="small"
                          type="link"
                          style={{ paddingLeft: 0, paddingTop: 6, fontSize: 12 }}
                          icon={<PlusOutlined />}
                          onClick={() => setShowAdd((s) => ({ ...s, [m.defId]: true }))}
                        >
                          记录附件文件名
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <Modal
        title="批量补编号"
        open={numOpen}
        onOk={doNumber}
        onCancel={() => setNumOpen(false)}
        okText="开始补号"
        cancelText="取消"
      >
        <p style={{ color: 'var(--text-2)' }}>
          将为所选项中<strong>尚未填写编号</strong>的材料按顺序生成编号（跳过已填项，并同步到概览证照汇总）。
        </p>
        <Space style={{ width: '100%' }} wrap>
          <Input
            style={{ width: 220 }}
            placeholder="编号前缀，如 2026SR"
            value={numPrefix}
            onChange={(e) => setNumPrefix(e.target.value)}
          />
          <Input
            type="number"
            style={{ width: 120 }}
            min={1}
            placeholder="起始序号"
            value={numStart}
            onChange={(e) => setNumStart(Number(e.target.value) || 1)}
          />
        </Space>
      </Modal>

      <Modal
        title="标记为被驳回"
        open={!!rejectTarget}
        onOk={confirmReject}
        onCancel={() => setRejectTarget(null)}
        okText="确认驳回"
        cancelText="取消"
      >
        <p style={{ color: 'var(--text-2)' }}>
          已选材料：<strong>{rejectTarget ? defOf(rejectTarget)?.name : ''}</strong>
        </p>
        <Input.TextArea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="填写驳回原因（市场给出的理由 / 缺什么材料）"
          maxLength={200}
          showCount
        />
      </Modal>
    </div>
  );
}
