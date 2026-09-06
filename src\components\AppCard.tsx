import { Button, Dropdown, Tag, Tooltip } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import type { AppRecord, AppStats } from '../types';
import { deriveStats } from '../store/derive';
import { getIndustry } from '../constants/industries';
import { STAGES } from '../constants/stages';

function segColor(idx: number, stats: AppStats): string {
  const ratio = stats.stages[idx].ratio;
  if (ratio >= 1) return '#1E9E63';
  if (idx === stats.stages.findIndex((s) => s.ratio < 1)) return '#C88719';
  if (ratio > 0) return '#C88719';
  return '#E4E9F1';
}

function statusInfo(stats: AppStats): { label: string; bg: string; fg: string } {
  if (stats.launched) return { label: '已上架', bg: 'var(--chip-ok-bg)', fg: 'var(--chip-ok-fg)' };
  const doneCount = stats.stages.filter((s) => s.ratio >= 1).length;
  if (doneCount === 0) return { label: '资质准备', bg: 'var(--chip-warn-bg)', fg: 'var(--chip-warn-fg)' };
  return { label: stats.currentStage.name, bg: 'var(--chip-info-bg)', fg: 'var(--chip-info-fg)' };
}

function initials(name: string): string {
  const s = name.trim();
  return s ? s.slice(0, 1).toUpperCase() : '?';
}

interface Props {
  app: AppRecord;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AppCard({ app, onOpen, onEdit, onDelete }: Props) {
  const stats = deriveStats(app);
  const industry = getIndustry(app.industryId);
  const info = statusInfo(stats);

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--card-bg)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color .15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2E6BE6')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: 'var(--brand-soft, #E7F0FD)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2057C9',
            fontWeight: 500,
            flexShrink: 0
          }}
        >
          {initials(app.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.packageName}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: [
                { key: 'edit', label: '编辑信息' },
                { type: 'divider' },
                { key: 'delete', label: '删除', danger: true }
              ],
              onClick: ({ key }) => {
                if (key === 'edit') onEdit();
                if (key === 'delete') onDelete();
              }
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多操作" />
          </Dropdown>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Tag style={{ marginRight: 0 }} color="default">
          {industry.name}
        </Tag>
        <Tag style={{ marginRight: 0, background: info.bg, color: info.fg, border: 'none' }}>{info.label}</Tag>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-2)' }} className="num">
          {stats.completion}%
        </span>
      </div>

      <Tooltip
        title={STAGES.map(
          (s, i) => `${s.name} ${stats.stages[i].done}/${stats.stages[i].total}`
        ).join(' · ')}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <span
              key={s.id}
              title={`${s.name} ${Math.round(stats.stages[i].ratio * 100)}%`}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: segColor(i, stats)
              }}
            />
          ))}
        </div>
      </Tooltip>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
        <span className="num">
          材料 {stats.materialDone}/{stats.materialTotal}
        </span>
        <span className="num">自查 {stats.checkDone}/{stats.checkTotal}</span>
        <span className="num">市场 {stats.marketPassed}/{stats.marketTotal}</span>
      </div>
    </div>
  );
}
