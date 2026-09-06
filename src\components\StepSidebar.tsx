import { useMemo, type ReactNode } from 'react';
import { Badge, Button, Popover, Tag, Tooltip } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import type { AppRecord } from '../types';
import { deriveGaps, deriveStats } from '../store/derive';
import { STAGES } from '../constants/stages';

interface Props {
  app: AppRecord;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

function rowIcon(stageIdx: number, curIdx: number, done: boolean): { bg: string; fg: string; content: ReactNode } {
  if (done) return { bg: '#1E9E63', fg: '#fff', content: <CheckOutlined style={{ fontSize: 11 }} /> };
  if (stageIdx === curIdx) return { bg: '#2E6BE6', fg: '#fff', content: stageIdx + 1 };
  return { bg: 'transparent', fg: '#96A0AF', content: stageIdx + 1 };
}

export default function StepSidebar({ app, activeTab, onSelectTab }: Props) {
  const stats = useMemo(() => deriveStats(app), [app]);
  const gaps = useMemo(() => deriveGaps(app), [app]);
  const curIdx = stats.stages.findIndex((s) => s.ratio < 1);

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        padding: '10px 12px',
        position: 'sticky',
        top: 76
      }}
    >
      <div style={{ padding: '8px 8px 10px', borderBottom: '0.5px solid var(--line)', marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.packageName}
        </div>
      </div>

      {STAGES.map((stage, i) => {
        const st = stats.stages[i];
        const done = st.ratio >= 1;
        const isCur = i === curIdx;
        const isFuture = i > curIdx;
        const icon = rowIcon(i, curIdx, done);
        const tab = stage.targetTab;

        const row = (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (done || isCur) onSelectTab(tab);
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && (done || isCur)) {
                e.preventDefault();
                onSelectTab(tab);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 8px',
              borderRadius: 8,
              cursor: done || isCur ? 'pointer' : 'default',
              background: isCur ? 'var(--chip-active-bg)' : 'transparent',
              color: isCur ? 'var(--chip-active-fg)' : done ? 'var(--chip-ok-fg)' : isFuture ? 'var(--text-3)' : 'var(--text-1)'
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: icon.bg,
                border: done ? 'none' : '1.5px solid ' + (isCur ? 'var(--brand)' : 'var(--line)'),
                color: icon.fg,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {icon.content}
            </span>
            <span style={{ fontSize: 14, fontWeight: isCur ? 500 : 400 }}>{stage.name}</span>
            <span
              className="num"
              style={{ marginLeft: 'auto', fontSize: 12, color: done ? 'var(--chip-ok-fg)' : isCur ? 'var(--chip-active-fg)' : 'var(--text-3)' }}
            >
              {st.done}/{st.total}
            </span>
          </div>
        );

        if (isFuture) {
          return (
            <Popover
              key={stage.id}
              trigger="click"
              placement="right"
              title={stage.name + ' · 尚未满足条件'}
              content={
                <div style={{ maxWidth: 260, maxHeight: 240, overflow: 'auto' }}>
                  {gaps.length === 0 ? (
                    <div style={{ color: 'var(--text-2)', fontSize: 13 }}>暂无缺口</div>
                  ) : (
                    gaps.map((g, idx) => (
                      <div key={idx} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)' }}>
                        {g}
                      </div>
                    ))
                  )}
                  <Button type="link" size="small" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => onSelectTab(tab)}>
                    前往处理 →
                  </Button>
                </div>
              }
            >
              <div style={{ cursor: 'pointer' }}>{row}</div>
            </Popover>
          );
        }

        return <div key={stage.id}>{row}</div>;
      })}

      <div style={{ marginTop: 10, borderTop: '0.5px solid var(--line)', paddingTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
        <Tooltip title={activeTab === 'materials' ? '当前查看：材料台账' : `当前查看：${activeTab}`}>
          <Badge status={stats.launched ? 'success' : 'processing'} text={stats.launched ? '已上架' : '进行中'} />
        </Tooltip>
        <Tag style={{ marginLeft: 6 }}>{stats.completion}%</Tag>
      </div>
    </div>
  );
}
