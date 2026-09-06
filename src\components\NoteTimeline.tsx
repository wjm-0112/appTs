import { useState } from 'react';
import { Button, Empty, Input, Select, Tag, Timeline } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { NoteLog } from '../types';

const NOTE_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'node', label: '节点记录', color: 'blue' },
  { value: 'reject', label: '驳回记录', color: 'red' },
  { value: 'call', label: '电话核验', color: 'orange' },
  { value: 'qual', label: '资质办理', color: 'green' }
];

interface Props {
  notes: NoteLog[];
  onAdd: (text: string, type?: string) => void;
  onRemove: (noteId: string) => void;
}

export default function NoteTimeline({ notes, onAdd, onRemove }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState('node');

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), type);
    setText('');
  };

  return (
    <div>
      <div style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            size="small"
            value={type}
            onChange={setType}
            style={{ width: 120 }}
            options={NOTE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input
            size="middle"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="记录一条进展（如：今日收到管局短信核验）"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={submit}
            maxLength={200}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={submit}>
            添加
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <Empty description="暂无记录，添加第一条进展吧" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
      ) : (
        <Timeline
          items={notes.map((n) => {
            const meta = NOTE_TYPES.find((t) => t.value === n.type) ?? NOTE_TYPES[0];
            return {
              color: meta.color,
              children: (
                <div style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <Tag color={meta.color} style={{ marginRight: 0 }}>
                      {meta.label}
                    </Tag>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {new Date(n.at).toLocaleString('zh-CN', { hour12: false })}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      danger
                      style={{ marginLeft: 'auto' }}
                      icon={<DeleteOutlined />}
                      onClick={() => onRemove(n.id)}
                      aria-label="删除记录"
                    />
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.text}</div>
                </div>
              )
            };
          })}
        />
      )}
    </div>
  );
}
