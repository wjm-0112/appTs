import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Segmented,
  Skeleton,
  Statistic
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import AppCard from '../components/AppCard';
import AppCreateModal, { type AppFormValues } from '../components/AppCreateModal';
import EmptyState from '../components/EmptyState';
import type { AppRecord, StageId } from '../types';
import { deriveGaps, deriveStats } from '../store/derive';
import { STAGES } from '../constants/stages';

const FILTERS: { label: string; value: 'all' | StageId }[] = [
  { label: '全部', value: 'all' },
  ...STAGES.slice(0, 4).map((s) => ({ label: s.name, value: s.id as StageId })),
  { label: '上架维护', value: 'launch' as StageId }
];

export default function Dashboard() {
  const nav = useNavigate();
  const { message: msg } = AntApp.useApp();
  const { ready, storageDisabled, apps, addApp, updateAppInfo, removeApp, profile, bulkSetMarkets, setMaterial } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppRecord | null>(null);
  const [deleting, setDeleting] = useState<AppRecord | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [filter, setFilter] = useState<'all' | StageId>('all');

  const sorted = useMemo(
    () => [...apps].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [apps]
  );
  const filtered = useMemo(
    () =>
      sorted.filter((a) => {
        if (filter === 'all') return true;
        const stats = deriveStats(a);
        return stats.currentStage.id === filter;
      }),
    [sorted, filter]
  );

  const overview = useMemo(() => {
    const statsList = sorted.map((a) => deriveStats(a));
    const ongoing = sorted.filter((_a, i) => !statsList[i].launched).length;
    const avg = statsList.length ? Math.round(statsList.reduce((s, x) => s + x.completion, 0) / statsList.length) : 0;
    let suggestion = '新建一个 App 开始提审管理';
    for (let i = 0; i < sorted.length; i += 1) {
      const st = statsList[i];
      if (st.launched) continue;
      const gaps = deriveGaps(sorted[i]);
      if (gaps.length) {
        suggestion = `${sorted[i].name} · ${gaps[0]}`;
        break;
      }
    }
    return { ongoing, avg, suggestion };
  }, [sorted]);

  const duplicates = useMemo(() => apps.map((a) => a.packageName), [apps]);

  if (!ready) {
    return (
      <div className="page-wrap">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const handleSubmit = (values: AppFormValues) => {
    if (editing) {
      updateAppInfo(editing.id, values);
      msg.success('已保存');
      setEditing(null);
    } else {
      const app = addApp(values);
      // 建档自动带出：默认测试账号 → 未填的市场；默认隐私政策链接 → filing_privacy（仅空值）
      if (profile.defaults.testAccount) {
        const emptyMarkets = app.markets.filter((m) => !m.testAccount).map((m) => m.marketId);
        if (emptyMarkets.length > 0) {
          bulkSetMarkets(app.id, emptyMarkets, { testAccount: profile.defaults.testAccount });
        }
      }
      if (profile.defaults.privacyUrl && !app.materials.find((m) => m.defId === 'filing_privacy')?.url) {
        setMaterial(app.id, 'filing_privacy', { url: profile.defaults.privacyUrl });
      }
      msg.success('已创建（已带入主体档案默认值），进入详情完善材料');
      setCreateOpen(false);
      nav(`/app/${app.id}`);
      return;
    }
    setCreateOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    setCreateOpen(true);
  };

  const doDelete = () => {
    if (!deleting) return;
    const raw = deleting.name.trim();
    const expected = raw.length >= 2 ? raw.slice(0, 2) : raw;
    if (confirmText.trim() !== expected) {
      msg.error('输入的文字不匹配，删除已取消');
      return;
    }
    removeApp(deleting.id);
    msg.success('已删除');
    setDeleting(null);
    setConfirmText('');
  };

  const delExpected = deleting ? (deleting.name.trim().length >= 2 ? deleting.name.trim().slice(0, 2) : deleting.name.trim()) : '';

  return (
    <div className="page-wrap">
      {storageDisabled && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前浏览器无法持久保存数据（可能处于隐私模式），刷新后改动将丢失。请尽快导出备份。"
        />
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="进行中的 App" value={overview.ongoing} suffix={`/ ${apps.length}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>建议下一步</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#2057C9', wordBreak: 'break-all' }}>
              {overview.suggestion}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="平均进度" value={overview.avg} suffix="%" />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as 'all' | StageId)}
          options={FILTERS.map((f) => ({ label: f.label, value: f.value }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建 App
        </Button>
      </div>

      {filtered.length === 0 ? (
        apps.length === 0 ? (
          <EmptyState
            title="还没有 App"
            description="点击下方按钮新建第一款，自动生成材料与自查清单"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建 App
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="当前筛选下没有 App" description="试试切换上方的阶段筛选" />
        )
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'
          }}
        >
          {filtered.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onOpen={() => nav(`/app/${app.id}`)}
              onEdit={() => {
                setEditing(app);
                setCreateOpen(true);
              }}
              onDelete={() => {
                setDeleting(app);
                setConfirmText('');
              }}
            />
          ))}
          {filter === 'all' && (
            <button
              onClick={openCreate}
              style={{
                border: '1.5px dashed #C9D6EA',
                background: 'transparent',
                borderRadius: 12,
                minHeight: 160,
                cursor: 'pointer',
                fontSize: 14,
                color: '#2E6BE6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 16
              }}
            >
              <PlusOutlined style={{ fontSize: 20 }} />
              新建 App
            </button>
          )}
        </div>
      )}

      <AppCreateModal
        open={createOpen}
        editing={editing}
        existingPackages={duplicates}
        onCancel={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <Modal
        title={`删除「${deleting?.name ?? ''}」`}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onOk={doDelete}
        okText="确认删除"
        okButtonProps={{ danger: true, disabled: confirmText.trim().length < Math.max(1, delExpected.length) }}
        cancelText="取消"
      >
        <p style={{ color: 'var(--text-2)' }}>
          删除后该 App 的材料进度、自查记录、市场跟踪将<strong>不可恢复</strong>（可先从设置导出备份）。
        </p>
        <p style={{ margin: '4px 0 8px', fontSize: 13 }}>
          请输入该 App 名称
          {delExpected.length >= 2 ? '的<strong>前两个字</strong>' : ''}以确认：
          <span style={{ color: 'var(--chip-danger-fg)' }}>{delExpected}</span>
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`输入「${delExpected}」`}
          maxLength={Math.max(1, delExpected.length)}
        />
      </Modal>
    </div>
  );
}
