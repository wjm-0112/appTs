import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty, FloatButton, Input, Skeleton, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';
import '../styles/kb.css';
import CopyBlock, { flattenText } from '../components/CopyBlock';

const rawLoaders = import.meta.glob('../content/*.md', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>;

const ARTICLES: { id: string; title: string; file: string }[] = [
  { id: '01', title: '五阶段全程指南', file: '../content/01-guide-stages.md' },
  { id: '02', title: '软著申请规范与排版说明', file: '../content/02-copyright.md' },
  { id: '03', title: 'APP 备案指引与字段清单', file: '../content/03-app-filing.md' },
  { id: '04', title: 'ICP 与公安联网备案', file: '../content/04-icp-police.md' },
  { id: '05', title: '隐私政策条款模板（含清单骨架）', file: '../content/05-privacy.md' },
  { id: '06', title: '六市场差异对照', file: '../content/06-market-diff.md' },
  { id: '07', title: '高频驳回 TOP6 与对策', file: '../content/07-reject.md' },
  { id: '08', title: '各市场后台填写字段对照', file: '../content/08-market-fields.md' },
  { id: '09', title: '常用文案模板', file: '../content/09-copy.md' },
  { id: '10', title: '华为应用市场提审方案', file: '../content/10-hw-submit.md' },
  { id: '11', title: '小米应用商店提审方案', file: '../content/11-xiaomi-submit.md' },
  { id: '12', title: 'OPPO 软件商店提审方案', file: '../content/12-oppo-submit.md' },
  { id: '13', title: 'vivo 应用商店提审方案', file: '../content/13-vivo-submit.md' },
  { id: '14', title: '荣耀应用市场提审方案', file: '../content/14-honor-submit.md' },
  { id: '15', title: '腾讯应用宝提审方案', file: '../content/15-tencent-submit.md' }
];

function groupOf(id: string): string {
  return Number(id) >= 10 ? '分市场提审方案（实战手册）' : '通用指南';
}

const FOOTER = '信息核实于 2026-09 · 政策可能调整，请以各应用市场官方最新审核要求为准';

function PreBlock({ children }: { children?: ReactNode }) {
  const text = flattenText(children);
  return (
    <div>
      <div className="kb-pre-head">
        <CopyBlock text={text} label="复制代码" />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export default function Knowledge() {
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [kw, setKw] = useState('');
  const [active, setActive] = useState('01');

  // 按需加载单篇
  const ensure = useCallback(
    async (id: string) => {
      if (bodies[id] !== undefined) return;
      const article = ARTICLES.find((a) => a.id === id);
      if (!article) return;
      try {
        const loader = rawLoaders[article.file];
        const raw = loader ? await loader() : '';
        setBodies((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: raw }));
      } catch {
        /* noop */
      }
    },
    [bodies]
  );

  const ensureAll = useCallback(() => {
    for (const a of ARTICLES) void ensure(a.id);
  }, [ensure]);

  useEffect(() => {
    void ensure('01');
  }, [ensure]);

  const filtered = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter((a) => {
      const body = (bodies[a.id] ?? '').toLowerCase();
      return a.title.toLowerCase().includes(q) || body.includes(q);
    });
  }, [kw, bodies]);

  const loadedCount = Object.keys(bodies).length;

  return (
    <div className="page-wrap">
      <div className="layout-2col">
        <div
          className="kb-nav"
          style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, padding: 14, position: 'sticky', top: 76 }}
        >
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>知识库</div>
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--text-3)' }} />}
            placeholder="搜标题 / 正文"
            value={kw}
            onChange={(e) => {
              const v = e.target.value;
              setKw(v);
              if (v.trim()) ensureAll(); // 搜索时补齐未加载篇以支持正文检索
            }}
            style={{ marginBottom: 10 }}
          />
          {loadedCount === 0 ? (
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          ) : filtered.length === 0 ? (
            <Empty description="无匹配文章" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '12px 0' }} />
          ) : (
            (() => {
              const nodes: ReactNode[] = [];
              let lastGroup = '';
              filtered.forEach((a) => {
                const g = groupOf(a.id);
                if (g !== lastGroup) {
                  nodes.push(
                    <div key={`g-${g}`} style={{ fontSize: 11, color: 'var(--text-3)', padding: '10px 10px 4px', letterSpacing: 0.5 }}>
                      {g}
                    </div>
                  );
                  lastGroup = g;
                }
                nodes.push(
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      void ensure(a.id);
                      setActive(a.id);
                      window.scrollTo({ top: 0, behavior: 'auto' });
                    }}
                    aria-pressed={active === a.id}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: active === a.id ? 'var(--chip-active-bg)' : 'transparent',
                      color: active === a.id ? 'var(--chip-active-fg)' : 'var(--text-1)',
                      borderRadius: 8,
                      padding: '7px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      marginBottom: 2,
                      lineHeight: 1.5
                    }}
                  >
                    {a.title}
                  </button>
                );
              });
              return nodes;
            })()
          )}
        </div>

        <div style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, padding: '20px 24px', minWidth: 0 }}>
          {!bodies[active] ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, alignItems: 'center', gap: 8 }}>
                <Tag style={{ marginRight: 0 }}>知识库</Tag>
                <CopyBlock text={bodies[active]} label="复制全文" />
              </div>
              <div className="kb">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children }) => <PreBlock>{children}</PreBlock>,
                    a: (p) => (
                      <a href={(p.href as string) || '#'} target="_blank" rel="noreferrer">
                        {p.children}
                      </a>
                    )
                  }}
                >
                  {bodies[active]}
                </ReactMarkdown>
              </div>
              <div style={{ marginTop: 20, paddingTop: 12, borderTop: '0.5px solid var(--line-soft)', color: 'var(--text-3)', fontSize: 12 }}>
                {FOOTER}
              </div>
              <FloatButton.BackTop visibilityHeight={280} tooltip="返回顶部" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
