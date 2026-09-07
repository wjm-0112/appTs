import { useEffect, useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Divider,
  Input,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Typography
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useApp } from '../store/AppContext';
import { INDUSTRIES } from '../constants/industries';
import {
  exportJson,
  importJson,
  listBackups,
  restoreBackup,
  deleteBackup,
  resetData,
  loadAppState,
  CURRENT_STATE_VERSION
} from '../data/db';

export default function Settings() {
  const { message: msg } = AntApp.useApp();
  const { apps, importAll, resetAll, storageDisabled, profile, updateProfile, clearProfile, flushNow } = useApp();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState('');
  const [backups, setBackups] = useState<{ key: string; at: string; count: number }[]>([]);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    entityName: '',
    legalPerson: '',
    bank: '',
    industryId: 'tool',
    testAccount: '',
    privacyUrl: ''
  });

  useEffect(() => {
    setDraft({
      entityName: profile.entity.name ?? '',
      legalPerson: profile.entity.legalPerson ?? '',
      bank: profile.entity.bank ?? '',
      industryId: profile.defaults.industryId ?? 'tool',
      testAccount: profile.defaults.testAccount ?? '',
      privacyUrl: profile.defaults.privacyUrl ?? ''
    });
  }, [profile]);

  const saveProfileCard = () => {
    updateProfile({
      entity: {
        name: draft.entityName.trim() || undefined,
        legalPerson: draft.legalPerson.trim() || undefined,
        bank: draft.bank.trim() || undefined
      },
      defaults: {
        industryId: draft.industryId || 'tool',
        testAccount: draft.testAccount.trim() || undefined,
        privacyUrl: draft.privacyUrl.trim() || undefined
      }
    });
    msg.success('主体档案已保存，新建 App 将自动带出');
  };

  const refreshBackups = () => {
    void listBackups().then(setBackups);
  };

  useEffect(() => {
    refreshBackups();
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null && e.quota != null) setStorage({ used: e.usage, quota: e.quota });
    });
  }, []);

  const doExport = async () => {
    setBusy(true);
    try {
      await flushNow(); // 确保导出的是最新内存数据
      const json = await exportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      a.href = url;
      a.download = `app-ts-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      msg.success('已导出备份文件');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingText) return;
    await flushNow(); // 先落盘本地，避免备份/覆盖基于旧数据
    const res = await importJson(pendingText);
    setPendingText(null);
    if (!res.ok) {
      msg.error(res.error ?? '导入失败');
      return;
    }
    const fresh = await loadAppState();
    importAll(fresh);
    msg.success(`导入成功：${res.count} 款 App（旧数据已自动备份）`);
    refreshBackups();
  };

  const doReset = () => {
    if (confirmReset !== '重置') return;
    void resetData().then(() => {
      resetAll();
      setConfirmReset('');
      msg.success('已重置为空白工作台（备份记录仍在）');
      refreshBackups();
    });
  };

  const usedMb = storage ? (storage.used / 1024 / 1024).toFixed(2) : null;
  const pct = storage && storage.quota ? Math.min(100, Math.round((storage.used / storage.quota) * 100)) : 0;

  return (
    <div className="page-wrap" style={{ maxWidth: 860 }}>
      <Card title="主体档案（建档自动带出）" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0 }}>
          只需维护一次：新建 App 会自动带出主体名称、默认品类、默认测试账号与默认隐私政策链接（均可单款修改）。
        </Typography.Paragraph>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>主体名称（营业执照主体）</div>
            <Input value={draft.entityName} onChange={(e) => setDraft((s) => ({ ...s, entityName: e.target.value }))} placeholder="公司全称" />
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>法人代表（选填）</div>
            <Input value={draft.legalPerson} onChange={(e) => setDraft((s) => ({ ...s, legalPerson: e.target.value }))} placeholder="法人姓名" />
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>对公账户备注（选填）</div>
            <Input value={draft.bank} onChange={(e) => setDraft((s) => ({ ...s, bank: e.target.value }))} placeholder="开户行 / 尾号等" />
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>默认品类（新建 App 默认选中）</div>
            <Select
              style={{ width: '100%' }}
              value={draft.industryId}
              onChange={(v) => setDraft((s) => ({ ...s, industryId: v }))}
              options={INDUSTRIES.map((i) => ({ value: i.id, label: i.name }))}
            />
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>默认测试账号（新建 App 六市场自动预填）</div>
            <Input value={draft.testAccount} onChange={(e) => setDraft((s) => ({ ...s, testAccount: e.target.value }))} placeholder="账号 / 密码" />
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>默认隐私政策 URL（新建 App 自动预填材料链接）</div>
            <Input value={draft.privacyUrl} onChange={(e) => setDraft((s) => ({ ...s, privacyUrl: e.target.value }))} placeholder="https://..." />
          </Col>
        </Row>
        <Space style={{ marginTop: 14 }}>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveProfileCard}>
            保存主体档案
          </Button>
          <Popconfirm
            title="清空主体档案？"
            description="仅清除档案设置，不影响各 App 已保存的数据。"
            okText="清空"
            cancelText="取消"
            onConfirm={() => {
              clearProfile();
              msg.success('已清空主体档案');
            }}
          >
            <Button danger>清空档案</Button>
          </Popconfirm>
        </Space>
      </Card>

      <Card title="数据备份与恢复" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<DownloadOutlined />} loading={busy} onClick={doExport}>
            导出 JSON 备份
          </Button>
          <label>
            <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onPickFile} />
            <Button icon={<UploadOutlined />} disabled={storageDisabled}>
              导入备份文件
            </Button>
          </label>
          <Button icon={<ReloadOutlined />} onClick={refreshBackups}>
            刷新备份列表
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12, marginBottom: 0 }}>
          导出文件包含 App 数据与主体档案；导入前会自动备份当前数据。导入旧版本备份（不含档案）时，不会改动你当前的档案设置。
        </Typography.Paragraph>

        <Divider plain style={{ fontSize: 12, color: 'var(--text-3)' }}>本机自动备份（最近 5 份）</Divider>
        {backups.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>暂无备份记录</Typography.Text>
        ) : (
          <List
            size="small"
            dataSource={backups}
            renderItem={(b) => (
              <List.Item
                actions={[
                  <Button
                    key="restore"
                    size="small"
                    type="link"
                    onClick={async () => {
                      await flushNow();
                      const s = await restoreBackup(b.key);
                      if (s) {
                        importAll(s);
                        msg.success('已恢复该备份（含档案时档案一并恢复）');
                      } else {
                        msg.error('备份不存在或已损坏');
                      }
                    }}
                  >
                    恢复为此版本
                  </Button>,
                  <Button
                    key="del"
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      void deleteBackup(b.key).then(() => {
                        msg.success('已删除备份');
                        refreshBackups();
                      })
                    }
                  />
                ]}
              >
                <FileTextOutlined style={{ marginRight: 8, color: 'var(--text-3)' }} />
                <span style={{ fontSize: 13 }}>{b.at}</span>
                <Tag style={{ marginLeft: 8 }}>{b.count} 款</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="数据重置" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          清空所有 App 数据并回到空白工作台。为防误操作，请输入「<strong>重置</strong>」后点击按钮。
        </Typography.Paragraph>
        <Space.Compact>
          <Input
            style={{ width: 180 }}
            placeholder="输入「重置」"
            value={confirmReset}
            onChange={(e) => setConfirmReset(e.target.value)}
          />
          <Button danger icon={<DeleteOutlined />} disabled={confirmReset !== '重置'} onClick={doReset}>
            执行重置
          </Button>
        </Space.Compact>
      </Card>

      <Card title="关于与隐私">
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>数据版本</div>
            <div style={{ fontSize: 20, fontWeight: 500 }} className="num">v{CURRENT_STATE_VERSION}</div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>App 数量</div>
            <div style={{ fontSize: 20, fontWeight: 500 }} className="num">{apps.length}</div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>材料条目</div>
            <div style={{ fontSize: 20, fontWeight: 500 }} className="num">
              {apps.reduce((s, a) => s + a.materials.length, 0)}
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>本地存储</div>
            <div style={{ fontSize: 20, fontWeight: 500 }} className="num">{usedMb ?? '—'} MB</div>
          </Col>
        </Row>
        {storage && (
          <Progress percent={pct} size="small" style={{ marginTop: 12 }} showInfo />
        )}
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
          本工具为纯前端个人工作台：数据仅保存在本机浏览器 IndexedDB，无账号、无云端、无任何网络上报；
          附件仅记录文件名不存储文件内容。建议定期导出备份文件保存到本地磁盘。
        </Typography.Paragraph>
      </Card>

      <Modal
        title="确认导入备份？"
        open={pendingText !== null}
        onOk={confirmImport}
        onCancel={() => setPendingText(null)}
        okText="确认覆盖导入"
        cancelText="取消"
      >
        <p>
          导入将<strong>覆盖</strong>当前 {apps.length} 款 App 数据；若文件包含主体档案，将同时覆盖当前档案。导入前会自动备份，可随时在备份列表恢复。
        </p>
        <p style={{ color: 'var(--text-2)' }}>如导入的是旧版本备份，系统会自动执行数据迁移。</p>
      </Modal>
    </div>
  );
}
