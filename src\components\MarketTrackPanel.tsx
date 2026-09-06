import { useState } from 'react';
import {
  App as AntApp,
  Button,
  Checkbox,
  Collapse,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { AppRecord, MarketTrack, MarketId } from '../types';
import { ACCOUNT_STATUS, MARKET_DEFS, SUBMIT_STATUS } from '../constants/markets';
import { useApp, type BulkMarketPatch } from '../store/AppContext';
import DiffCompareTable from './DiffCompareTable';

interface Props {
  app: AppRecord;
  onSetMarket: (marketId: string, patch: Partial<MarketTrack>) => void;
}

const SUBMIT_TAG: Record<MarketTrack['submit'], { text: string; bg: string; fg: string }> = {
  none: { text: '未提交', bg: 'var(--chip-gray-bg)', fg: 'var(--chip-gray-fg)' },
  submitted: { text: '已提交', bg: 'var(--chip-info-bg)', fg: 'var(--chip-info-fg)' },
  reviewing: { text: '审核中', bg: 'var(--chip-warn-bg)', fg: 'var(--chip-warn-fg)' },
  passed: { text: '已通过', bg: 'var(--chip-ok-bg)', fg: 'var(--chip-ok-fg)' },
  rejected: { text: '被驳回', bg: 'var(--chip-danger-bg)', fg: 'var(--chip-danger-fg)' }
};

const ACCOUNT_TAG: Record<MarketTrack['account'], string> = {
  none: '未注册',
  reviewing: '认证中',
  certified: '已认证'
};

function MarketForm({ mk, name, onSetMarket }: { mk: MarketTrack; name: string; onSetMarket: Props['onSetMarket'] }) {
  const { message: msg } = AntApp.useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [verInput, setVerInput] = useState('');

  const set = (patch: Partial<MarketTrack>) => onSetMarket(mk.marketId, patch);

  const changeSubmit = (v: MarketTrack['submit']) => {
    if (v === 'rejected') {
      if (!mk.rejectReason) {
        setReason(mk.rejectReason ?? '');
        setRejectOpen(true);
        return;
      }
      set({ submit: v });
      return;
    }
    set({ submit: v });
  };

  const confirmReject = () => {
    if (!reason.trim()) {
      msg.warning('请填写驳回原因');
      return;
    }
    set({ submit: 'rejected', rejectReason: reason.trim() });
    setRejectOpen(false);
    setReason('');
  };

  const addVer = () => {
    const v = verInput.trim();
    if (!v) return;
    set({ versionLog: [...mk.versionLog, v] });
    setVerInput('');
  };

  const meta = SUBMIT_TAG[mk.submit];
  const accountMeta = ACCOUNT_TAG[mk.account];

  return (
    <div>
      <Space style={{ marginBottom: 14 }} wrap>
        <span style={{ fontWeight: 500, fontSize: 15 }}>{name}</span>
        <Tag style={{ marginRight: 0, background: meta.bg, color: meta.fg, border: 'none' }}>{meta.text}</Tag>
        <Tag
          style={{
            marginRight: 0,
            background:
              mk.account === 'certified'
                ? 'var(--chip-ok-bg)'
                : mk.account === 'reviewing'
                  ? 'var(--chip-warn-bg)'
                  : 'var(--chip-gray-bg)',
            color:
              mk.account === 'certified'
                ? 'var(--chip-ok-fg)'
                : mk.account === 'reviewing'
                  ? 'var(--chip-warn-fg)'
                  : 'var(--chip-gray-fg)',
            border: 'none'
          }}
        >
          账号 {accountMeta}
        </Tag>
      </Space>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>开发者账号</div>
          <Select
            style={{ width: '100%' }}
            value={mk.account}
            onChange={(v) => set({ account: v })}
            options={ACCOUNT_STATUS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>提审状态</div>
          <Select
            style={{ width: '100%' }}
            value={mk.submit}
            onChange={(v) => changeSubmit(v as MarketTrack['submit'])}
            options={SUBMIT_STATUS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>测试账号（供审核员）</div>
          <Input placeholder="账号 / 密码" value={mk.testAccount ?? ''} onChange={(e) => set({ testAccount: e.target.value })} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>最近提交时间</div>
          <DatePicker
            style={{ width: '100%' }}
            value={mk.lastSubmitAt ? dayjs(mk.lastSubmitAt) : null}
            onChange={(d) => set({ lastSubmitAt: d ? d.toISOString() : undefined })}
            placeholder="选择日期"
            presets={[{ label: '今天', value: dayjs() }]}
          />
        </div>
        {mk.submit === 'passed' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>上架时间</div>
            <DatePicker
              style={{ width: '100%' }}
              value={mk.launchAt ? dayjs(mk.launchAt) : null}
              onChange={(d) => set({ launchAt: d ? d.toISOString() : undefined })}
              placeholder="已通过后选择"
              presets={[{ label: '今天', value: dayjs() }]}
            />
          </div>
        )}
      </div>

      {mk.submit === 'rejected' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>驳回原因</div>
          <Input.TextArea
            rows={2}
            value={mk.rejectReason ?? ''}
            onChange={(e) => set({ rejectReason: e.target.value })}
            placeholder="填写驳回原因与整改计划（重提审核时建议附上）"
            maxLength={300}
            showCount
          />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>版本更新日志</div>
        {mk.versionLog.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>暂无记录</div>
        )}
        {mk.versionLog.map((v, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
            <Tag style={{ marginRight: 0 }}>#{idx + 1}</Tag>
            <span style={{ flex: 1 }}>{v}</span>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="删除该条版本记录"
              onClick={() => set({ versionLog: mk.versionLog.filter((_, i) => i !== idx) })}
            />
          </div>
        ))}
        <Space.Compact style={{ width: 340, maxWidth: '100%' }}>
          <Input
            placeholder="新增版本说明，回车添加"
            value={verInput}
            onChange={(e) => setVerInput(e.target.value)}
            onPressEnter={addVer}
          />
          <Button icon={<PlusOutlined />} onClick={addVer}>
            添加
          </Button>
        </Space.Compact>
      </div>

      <Modal
        title="标记为被驳回"
        open={rejectOpen}
        onOk={confirmReject}
        onCancel={() => setRejectOpen(false)}
        okText="确认驳回"
        cancelText="取消"
      >
        <p style={{ color: 'var(--text-2)' }}>
          市场：<strong>{name}</strong>
        </p>
        <Input.TextArea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="填写驳回原因（审核意见）"
          maxLength={300}
          showCount
        />
      </Modal>
    </div>
  );
}

export default function MarketTrackPanel({ app, onSetMarket }: Props) {
  const { message: msg } = AntApp.useApp();
  const { bulkSetMarkets } = useApp();
  const [active, setActive] = useState<string>(app.markets[0]?.marketId ?? '');
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncFields, setSyncFields] = useState<{ testAccount: boolean; lastSubmitAt: boolean; versionLog: boolean }>({
    testAccount: true,
    lastSubmitAt: false,
    versionLog: false
  });
  const [targets, setTargets] = useState<string[]>([]);

  if (app.markets.length === 0) {
    return (
      <div>
        <Empty description="暂无市场跟踪，请先创建 App（系统会默认生成六市场）" style={{ padding: 24 }} />
        <DiffCompareAccordion />
      </div>
    );
  }

  const source = app.markets.find((m) => m.marketId === active) ?? app.markets[0];
  const others = app.markets.filter((m) => m.marketId !== source.marketId);
  const sourceName = MARKET_DEFS.find((m) => m.id === (source.marketId as MarketId))?.name ?? source.marketId;

  const openSync = () => {
    setSyncFields({ testAccount: !!source.testAccount, lastSubmitAt: !!source.lastSubmitAt, versionLog: source.versionLog.length > 0 });
    setTargets(others.map((m) => m.marketId));
    setSyncOpen(true);
  };

  const confirmSync = () => {
    if (targets.length === 0) {
      msg.warning('请至少选择一个目标市场');
      return;
    }
    const patch: BulkMarketPatch = {};
    if (syncFields.testAccount && source.testAccount) patch.testAccount = source.testAccount;
    if (syncFields.lastSubmitAt && source.lastSubmitAt) patch.lastSubmitAt = source.lastSubmitAt;
    if (syncFields.versionLog && source.versionLog.length) patch.versionLogAppend = source.versionLog;
    if (Object.keys(patch).length === 0) {
      msg.warning('所选字段在当前市场均无内容可同步');
      return;
    }
    bulkSetMarkets(app.id, targets, patch);
    msg.success(`已同步到 ${targets.length} 个市场`);
    setSyncOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button onClick={openSync} disabled={others.length === 0}>
          ← 同步「{sourceName}」到其它市场
        </Button>
      </div>
      <Tabs
        activeKey={active}
        onChange={setActive}
        items={app.markets.map((mk) => {
          const def = MARKET_DEFS.find((m) => m.id === (mk.marketId as MarketId));
          return {
            key: mk.marketId,
            label: def?.name ?? mk.marketId,
            children: <MarketForm mk={mk} name={def?.name ?? mk.marketId} onSetMarket={onSetMarket} />
          };
        })}
      />

      <Modal
        title={`从「${sourceName}」同步到其它市场`}
        open={syncOpen}
        onOk={confirmSync}
        onCancel={() => setSyncOpen(false)}
        okText="确认同步"
        cancelText="取消"
      >
        <p style={{ color: 'var(--text-2)' }}>
          以下内容将从当前市场复制：账号/提审状态/驳回原因/上架时间<strong>不会</strong>被同步。
        </p>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>要同步的字段</div>
          <Checkbox
            checked={syncFields.testAccount}
            disabled={!source.testAccount}
            onChange={(e) => setSyncFields((s) => ({ ...s, testAccount: e.target.checked }))}
          >
            测试账号{source.testAccount ? `（${source.testAccount}）` : '（当前无内容）'}
          </Checkbox>
          <div>
            <Checkbox
              checked={syncFields.lastSubmitAt}
              disabled={!source.lastSubmitAt}
              onChange={(e) => setSyncFields((s) => ({ ...s, lastSubmitAt: e.target.checked }))}
            >
              最近提交时间{source.lastSubmitAt ? `（${source.lastSubmitAt}）` : '（当前未填）'}
            </Checkbox>
          </div>
          <Checkbox
            checked={syncFields.versionLog}
            disabled={source.versionLog.length === 0}
            onChange={(e) => setSyncFields((s) => ({ ...s, versionLog: e.target.checked }))}
          >
            版本更新日志追加到目标市场{source.versionLog.length ? `（${source.versionLog.length} 条）` : '（当前无记录）'}
          </Checkbox>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>同步到哪些市场</div>
        <Checkbox.Group
          value={targets}
          onChange={(vals) => setTargets(vals as string[])}
          options={others.map((m) => {
            const def = MARKET_DEFS.find((x) => x.id === (m.marketId as MarketId));
            return { label: def?.name ?? m.marketId, value: m.marketId };
          })}
        />
      </Modal>

      <DiffCompareAccordion />
    </div>
  );
}

function DiffCompareAccordion() {
  return (
    <Collapse
      style={{ marginTop: 4 }}
      items={[
        {
          key: 'diff',
          label: <span style={{ fontWeight: 500 }}>六市场差异对照（12 主题 · 只读）</span>,
          children: <DiffCompareTable />
        }
      ]}
    />
  );
}
