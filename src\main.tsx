import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import './styles/global.css';
import { antdTheme, useSystemDark } from './styles/theme';
import { AppProvider } from './store/AppContext';
import AppShell from './App';

dayjs.locale('zh-cn');

function Root() {
  const dark = useSystemDark();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme(dark)}>
      <AntApp>
        <AppProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
