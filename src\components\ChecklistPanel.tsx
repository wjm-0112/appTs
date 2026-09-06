import { useMemo, useState } from 'react';
import { Button, Input, Progress, Segmented, Space, Switch, Tooltip, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { AppRecord, ChecklistItem } from '../types';
import { CHECKLIST_GROUPS, SELFCHECK_DEFS } from '../constants/selfcheck';

type FilterMode = 'all' | 'fail' | 'na';

interface Props {
  app: AppRecord;
  onSetCheck: (defId: string, patch: Partial<ChecklistItem>) => void;
}

export default function ChecklistPanel({ app, onSetCheck }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [editNote, setEditNote] = useState<Record<string, boolean>>({});

  const itemMap = useMemo(() => {
    const map = new Map<string, ChecklistItem>();
    app.checklist.forEach((c) => map.set(c.defId, c));
    return map;
  }, [app.checklist]);

  const groups = useMemo(() => {
    return CHECKLIST_GROUPS.map((g) => {
      const defs = SELFCHECK_DEFS.filter((d) => d.group === g);
      const items = defs.map((d) => ({ def: d, item: itemMap.get(d.id) }));
      return { group: g, items };
    });
  }, [itemMap]);

  const totalStats = useMemo(() => {
    let pass = 0;
    let total = 0;
    let na = 0;
    let fail = 0;
    for (const c of app.checklist) {
      if (c.na) {
        na += 1;
        continue;
      }
      total += 1;
      if (c.pass === true) pass += 1;
      if (c.pass === false) fail += 1;
    }
    return { pass, total, na, fail, pct: total ? Math.round((pass / total) * 100) : 100 };
  }, [app.checklist]);

  const countGroup = (groupId: string) => {
    let pass = 0;
    let total = 0;
    let na = 0;
    for (const c of app.checklist) {
      const def = SELFCHECK_DEFS.find((s) => s.id === c.defId);
      if (!def || def.group !== groupId) continue;
      if (c.na) {
        na += 1;
        continue;
      }
      total += 1;
      if (c.pass === true) pass += 1;
    }
    return { pass, total, na, pct: total ? Math.round((pass / total) * 100) : 100 };
  };

  const visible = (item?: ChecklistItem): boolean => {
    if (!item) return true;
    if (filter === 'na') return item.na;
    if (filter === 'fail') return !item.na && item.pass === false;
    return true;
  };

  const checkCount = SELFCHECK_DEFS.length;
  const naCount = app.checklist.filter((c) => c.na).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as FilterMode)}
          options={[
            { label: `全部（${checkCount}）`, value: 'all' },
            { label: `未通过（${totalStats.fail}）`, value: 'fail' },
            { label: `不适用（${naCount}）`, value: 'na' }
          ]}
        />
        <span style={{ fontSize: 13, color: 'var(--text-2)' }} className="num">
          通过 {totalStats.pass}/{totalStats.total}（排除不适用 {totalStats.na} 项）
        </span>
      </div>

      {groups.map(({ group, items }) => {
        const g = countGroup(group);
        return (
          <div
            key={group}
            style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{group}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }} className="num">
                {g.pass}/{g.total} · 不适用 {g.na}
              </span>
              <div style={{ width: 140 }}>
                <Progress percent={g.pct} size="small" showInfo={false} strokeColor="#1E9E63" />
              </div>
            </div>
            {items
              .filter(({ item }) => visible(item))
              .map(({ def, item }) => {
                const cur = item ?? { pass: null as boolean | null, na: false, note: undefined as string | undefined };
                const na = !!cur.na;
                const pass = cur.pass === true;
                const fail = cur.pass === false;
                const showNote = !!cur.note || !!editNote[def.id];
                return (
                  <div
                    key={def.id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '9px 14px',
                      borderTop: '0.5px solid var(--line-soft)',
                      alignItems: 'flex-start',
                      opacity: na ? 0.55 : 1,
                      flexWrap: 'wrap'
                    }}
                  >
                    <input
                      id={`ck-${def.id}`}
                      type="checkbox"
                      disabled={na}
                      checked={pass}
                      onChange={(e) => {
                        const val = e.target.checked;
                        onSetCheck(def.id, { pass: val, na: false });
                        if (val) message.success('已标记通过');
                      }}
                      style={{ marginTop: 4, width: 15, height: 15, cursor: na ? 'not-allowed' : 'pointer' }}
                      aria-label={`${def.text} 通过`}
                    />
                    <label
                      htmlFor={`ck-${def.id}`}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        fontSize: 14,
                        lineHeight: 1.6,
                        textDecoration: na ? 'line-through' : 'none',
                        color: fail ? 'var(--chip-danger-fg)' : undefined,
                        cursor: na ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {def.text}
                    </label>
                    <Space size={4} wrap>
                      {fail && (
                        <Button
                          size="small"
                          type="link"
                          style={{ color: 'var(--chip-danger-fg)', fontSize: 12 }}
                          onClick={() => onSetCheck(def.id, { pass: null })}
                        >
                          恢复待定
                        </Button>
                      )}
                      {!pass && !na && (
                        <Button
                          size="small"
                          type="link"
                          style={{ color: 'var(--chip-danger-fg)', fontSize: 12 }}
                          onClick={() => {
                            onSetCheck(def.id, { pass: false, na: false });
                            message.warning('已标记为未通过，请补充说明');
                          }}
                        >
                          标记未通过
                        </Button>
                      )}
                      <Switch
                        size="small"
                        checked={na}
                        checkedChildren="不适用"
                        unCheckedChildren="适用"
                        onChange={(v) => onSetCheck(def.id, { na: v, pass: v ? null : cur.pass })}
                      />
                      <Tooltip title="备注">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => setEditNote((s) => ({ ...s, [def.id]: !s[def.id] }))}
                        />
                      </Tooltip>
                    </Space>
                    {showNote && (
                      <div style={{ flexBasis: '100%', marginTop: 6 }}>
                        <Input
                          size="small"
                          placeholder="补充说明（整改记录等）"
                          value={cur.note ?? ''}
                          onChange={(e) => onSetCheck(def.id, { note: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        勾选规则：通过率 = 通过 /（总数 − 不适用）。标记「不适用」后将不纳入统计。
      </Typography.Text>
    </div>
  );
}
