import { Table, Tag, Tooltip } from 'antd';
import type { MarketId } from '../types';
import { DIFF_TOPICS, MARKET_DEFS, type DiffCell } from '../constants/markets';

const LEVEL_META: Record<number, { text: string; bg: string; fg: string }> = {
  0: { text: '不要求', bg: 'var(--chip-gray-bg)', fg: 'var(--chip-gray-fg)' },
  1: { text: '建议', bg: 'var(--chip-warn-bg)', fg: 'var(--chip-warn-fg)' },
  2: { text: '必须', bg: 'var(--chip-info-bg)', fg: 'var(--chip-info-fg)' }
};

function CellView({ cell }: { cell?: DiffCell }) {
  if (!cell) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  const meta = LEVEL_META[cell.level];
  const inner = (
    <Tag style={{ marginRight: 0, background: meta.bg, color: meta.fg, border: 'none' }}>{meta.text}</Tag>
  );
  return cell.note ? (
    <Tooltip title={cell.note}>
      <span style={{ cursor: 'help' }}>{inner}</span>
    </Tooltip>
  ) : (
    inner
  );
}

export default function DiffCompareTable() {
  const columns = [
    {
      title: '对照项',
      dataIndex: 'topic',
      key: 'topic',
      fixed: 'left' as const,
      width: 170,
      render: (v: string) => <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
    },
    ...MARKET_DEFS.map((m) => ({
      title: m.name,
      key: m.id,
      width: 110,
      render: (_: unknown, row: (typeof DIFF_TOPICS)[number]) => <CellView cell={row.cells[m.id as MarketId]} />
    }))
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <Table
        rowKey="topic"
        size="small"
        columns={columns}
        dataSource={DIFF_TOPICS}
        pagination={false}
        scroll={{ x: 900 }}
        style={{ minWidth: 860 }}
      />
    </div>
  );
}
