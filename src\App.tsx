import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Skeleton, Tag } from 'antd';
import { AppstoreOutlined, BookOutlined, SettingOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useApp } from './store/AppContext';
import Dashboard from './pages/Dashboard';
import AppDetail from './pages/AppDetail';

const Knowledge = lazy(() => import('./pages/Knowledge'));
const Settings = lazy(() => import('./pages/Settings'));

const { Header, Content } = Layout;

function keyForPath(pathname: string): string {
  if (pathname.startsWith('/app')) return 'home';
  if (pathname.startsWith('/knowledge')) return 'knowledge';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const { storageDisabled, lastSavedAt } = useApp();

  // 滚动复位
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <Layout style={{ minHeight: '100%', background: 'var(--page-bg)' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          height: 56,
          lineHeight: '56px',
          padding: '0 20px',
          background: 'var(--card-bg)',
          borderBottom: '0.5px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <Link to="/" className="brand-txt" style={{ fontSize: 16, fontWeight: 600, color: '#2E6BE6', whiteSpace: 'nowrap', lineHeight: '56px' }}>
          提审工作台
        </Link>
        <Menu
          className="hd-menu"
          mode="horizontal"
          selectedKeys={[keyForPath(loc.pathname)]}
          onClick={({ key }) => nav(key)}
          items={[
            { key: 'home', icon: <AppstoreOutlined />, label: '工作台' },
            { key: 'knowledge', icon: <BookOutlined />, label: '知识库' },
            { key: 'settings', icon: <SettingOutlined />, label: '设置' }
          ]}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none', lineHeight: '54px', background: 'transparent' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1 }}>
          {storageDisabled ? (
            <Tag color="warning" style={{ margin: 0 }}>
              存储不可用
            </Tag>
          ) : lastSavedAt ? (
            <Tag color="success" icon={<CheckCircleFilled />} style={{ margin: 0 }}>
              已保存<span className="hd-time"> {lastSavedAt}</span>
            </Tag>
          ) : (
            <Tag style={{ margin: 0 }}>数据仅存本机</Tag>
          )}
        </div>
      </Header>
      <Content>
        <Suspense
          fallback={
            <div className="page-wrap">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/app/:id" element={<AppDetail />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </Content>
    </Layout>
  );
}
