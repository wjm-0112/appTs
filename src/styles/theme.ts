import { useEffect, useState } from 'react';
import { theme, type ThemeConfig } from 'antd';

export const BRAND = '#2E6BE6';
export const SUCCESS = '#1E9E63';
export const WARNING = '#C88719';
export const DANGER = '#D94B4B';

export function useSystemDark(): boolean {
  const get = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [dark, setDark] = useState<boolean>(get);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export function antdTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: BRAND,
      colorInfo: BRAND,
      colorSuccess: SUCCESS,
      colorWarning: WARNING,
      colorError: DANGER,
      borderRadius: 8,
      fontSize: 14
    },
    components: {
      Layout: {
        headerBg: isDark ? '#1D2129' : '#FFFFFF',
        bodyBg: isDark ? '#14171C' : '#F4F6FA'
      },
      Card: { headerBg: 'transparent' }
    }
  };
}
