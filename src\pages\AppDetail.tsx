import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Result,
  Select,
  Tabs,
  Tag,
  Typography
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { PKG_RE } from '../constants/validate';
import type { AppRecord } from '../types';
import { useApp } from '../store/AppContext';
import { deriveStats } from '../store/derive';
import { getIndustry, INDUSTRIES } from '../constants/industries';
import StepSidebar from '../components/StepSidebar';
import MaterialsBoard from '../components/MaterialsBoard';
import NoteTimeline from '../components/NoteTimeline';
import ChecklistPanel from '../components/ChecklistPanel';
import MarketTrackPanel from '../components/MarketTrackPanel';

function OverviewPanel({ app }: { app: AppRecord }) {
  const { message: msg } = AntApp.useApp();
  const { apps, updateAppInfo, profile } = useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      name: app.name,
      packageName: app.packageName,
      industryId: app.industryId,
      entityName: app.entity.name
    });
  }, [app, form]);

  const otherPackages = useMemo(() => apps.filter((a) => a.id !== app.id).map((a) => a.packageName), [apps, app.id]);

  const fillFromProfile = () => {
    form.setFieldsValue({ entityName: profile.entity.name ?? '' });
    msg.success('已填入档案主体名称，点「保存基本信息」生效');
  };

  const save = () => {
    form
      .validateFields()
      .then((v) => {
        updateAppInfo(app.id, v);
        msg.success('已保存');
      })
      .catch(() => undefined);
  };

  const certItems = [
    { label: '软著编号', value: app.certNo.copyright },
    { label: '域名 ICP 备案号', value: app.certNo.icp },
    { label: 'APP 备案号', value: app.certNo.appIcp },
    { label: '公安联网备案号', value: app.certNo.police },
    { label: '测试报告编号', value: app.certNo.report }
  ];

  return (
    <div>
      <Form form={form} layout="vertical" requiredMark={false} style={{ maxWidth: 560 }}>
        <Form.Item
          name="name"
          label="App 名称"
          rules={[
            { required: true, message: '请输入 App 名称' },
            { max: 30, message: '不超过 30 字' }
          ]}
        >
          <Input placeholder="与软著 / 备案名称保持一致" allowClear />
        </Form.Item>
        <Form.Item
          name="packageName"
          label="包名"
          extra="修改后请同步调整备案与各市场在架信息，避免一致性校验失败"
          rules={[
            { required: true, message: '请输入包名' },
            { pattern: PKG_RE, message: '包名需形如 com.example.app' },
            {
              validator: (_, val: string) =>
                val && otherPackages.includes(val.trim())
                  ? Promise.reject(new Error('该包名已被其它 App 使用'))
                  : Promise.resolve()
            }
          ]}
        >
          <Input allowClear />
        </Form.Item>
        <Form.Item name="industryId" label="业务品类">
          <Select options={INDUSTRIES.map((i) => ({ value: i.id, label: i.name }))} />
        </Form.Item>
        <Form.Item name="entityName" label="所属主体">
          <Input placeholder="营业执照主体名称" allowClear />
        </Form.Item>
        <Button type="primary" icon={<SaveOutlined />} onClick={save}>
          保存基本信息
        </Button>
        {!app.entity.name && profile.entity.name && (
          <Button style={{ marginLeft: 8 }} onClick={fillFromProfile}>
            使用档案填充主体
          </Button>
        )}
      </Form>

      {profile.defaults.testAccount || profile.defaults.privacyUrl ? (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -8, marginBottom: 4 }}>
          档案默认值：{profile.defaults.testAccount ? `测试账号 ${profile.defaults.testAccount}` : ''}
          {profile.defaults.privacyUrl ? ` · 隐私政策 ${profile.defaults.privacyUrl}` : ''}（在设置中可改，仅空值自动带出）
        </Typography.Text>
      ) : null}

      <Divider orientation="left" plain style={{ fontSize: 13, color: 'var(--text-2)' }}>
        证照编号汇总（在「材料台账」中填写后自动回填）
      </Divider>
      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2 }}
        items={certItems.map((c) => ({
          key: c.label,
          label: c.label,
          children: c.value || <Typography.Text type="secondary">—</Typography.Text>
        }))}
      />
    </div>
  );
}

const TAB_ITEMS = [
  { key: 'materials', label: '材料台账' },
  { key: 'overview', label: '概览' },
  { key: 'checklist', label: '自查清单' },
  { key: 'market', label: '市场提审' },
  { key: 'notes', label: '备注' }
];

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { apps, setMaterial, setCertNo, setCheck, setMarket, addNote, removeNote } = useApp();
  const app = apps.find((a) => a.id === id);
  const [tab, setTab] = useState('materials');

  // 侧边步骤条跳 Tab
  useEffect(() => {
    setTab((t) => (TAB_ITEMS.some((i) => i.key === t) ? t : 'materials'));
  }, [app?.id]);

  if (!app) {
    return (
      <div className="page-wrap">
        <Result
          status="404"
          title="App 不存在或已删除"
          extra={
            <Button type="primary" onClick={() => nav('/')}>
              返回工作台
            </Button>
          }
        />
      </div>
    );
  }

  const stats = deriveStats(app);
  const industry = getIndustry(app.industryId);

  const onSelectTab = (t: string) => {
    if (TAB_ITEMS.some((i) => i.key === t)) setTab(t);
  };

  return (
    <div className="page-wrap">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', marginBottom: 14, fontSize: 13 }}>
        <ArrowLeftOutlined /> 返回工作台
      </Link>
      <div className="layout-2col">
        <StepSidebar app={app} activeTab={tab} onSelectTab={onSelectTab} />

        <div style={{ minWidth: 0 }}>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{app.name}</div>
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{app.packageName}</div>
              </div>
              <Tag>{industry.name}</Tag>
              <Tag color={stats.launched ? 'success' : 'processing'}>
                {stats.launched ? '已上架' : `当前：${stats.currentStage?.name ?? ''}`}
              </Tag>
              <span style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 22 }} className="num">
                {stats.completion}%
              </span>
            </div>
          </Card>

          <div style={{ background: 'var(--card-bg)', border: '0.5px solid var(--line)', borderRadius: 12, padding: '6px 16px 16px' }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: 'materials',
                  label: '材料台账',
                  children: (
                    <MaterialsBoard
                      app={app}
                      onSetMaterial={(defId, patch) => setMaterial(app.id, defId, patch)}
                      onSyncCert={(patch) => setCertNo(app.id, patch)}
                    />
                  )
                },
                {
                  key: 'overview',
                  label: '概览',
                  children: <OverviewPanel app={app} />
                },
                {
                  key: 'checklist',
                  label: '自查清单',
                  children: (
                    <ChecklistPanel
                      app={app}
                      onSetCheck={(defId, patch) => setCheck(app.id, defId, patch)}
                    />
                  )
                },
                {
                  key: 'market',
                  label: '市场提审',
                  children: (
                    <MarketTrackPanel
                      app={app}
                      onSetMarket={(marketId, patch) => setMarket(app.id, marketId, patch)}
                    />
                  )
                },
                {
                  key: 'notes',
                  label: '备注',
                  children: <NoteTimeline notes={app.notes} onAdd={(text, type) => addNote(app.id, text, type)} onRemove={(nid) => removeNote(app.id, nid)} />
                }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
