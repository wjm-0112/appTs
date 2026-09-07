import { useState, type ReactNode } from 'react';
import { App as AntApp, Button } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

/** 递归提取 ReactNode 中的纯文本（用于代码块整段复制） */
export function flattenText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (typeof node === 'object' && 'props' in (node as object)) {
    const p = (node as { props?: { children?: ReactNode } }).props;
    return p && 'children' in p ? flattenText(p.children) : '';
  }
  return '';
}

export default function CopyBlock({ text, label = '复制' }: { text: string; label?: string }) {
  const { message } = AntApp.useApp();
  const [ok, setOk] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setOk(true);
    message.success('已复制');
    window.setTimeout(() => setOk(false), 1500);
  };

  return (
    <Button size="small" type="text" icon={ok ? <CheckOutlined /> : <CopyOutlined />} onClick={copy}>
      {ok ? '已复制' : label}
    </Button>
  );
}
