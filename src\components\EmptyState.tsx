import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export default function EmptyState({ title = '暂无数据', description, children }: Props) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <Empty description={null} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      <div style={{ marginTop: 8, fontWeight: 500, fontSize: 15 }}>{title}</div>
      {description && (
        <div style={{ marginTop: 4, color: 'var(--text-2)', fontSize: 13 }}>{description}</div>
      )}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
