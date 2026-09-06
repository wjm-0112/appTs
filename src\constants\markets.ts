import type { MarketDef } from '../types';

/** 六市场定义（差异对照行数据在 M3 补齐完整 11 主题矩阵） */
export const MARKET_DEFS: MarketDef[] = [
  {
    id: 'hw',
    name: '华为',

    policy: [
      '软著建议提供（三选一）；备案信息在版本页“校验证件号”。',
      '审核校验最严；提供四重检测与隐私检测服务。',
      '审核时效约 1–5 个工作日。'
    ]
  },
  {
    id: 'xiaomi',
    name: '小米',

    policy: [
      '软著强制（三选一）；截图不得含竞品手机水印。',
      '金融/医疗/新闻类目需第三方测试报告。',
      '审核时效约 1–3 个工作日。'
    ]
  },
  {
    id: 'oppo',
    name: 'OPPO',

    policy: [
      '软著（电子版权证书）强制。',
      '敏感权限需逐条填使用场景并附功能截图。',
      '高敏感类目需 CMA/CNAS 第三方测试报告。',
      '审核时效约 1–3 个工作日。'
    ]
  },
  {
    id: 'vivo',
    name: 'vivo',

    policy: [
      '软著强制，名称须与上传应用一致。',
      '深度合成/AI 类需加显式/隐式标识；直播交友禁低俗擦边。',
      '审核时效约 1–3 个工作日。'
    ]
  },
  {
    id: 'honor',
    name: '荣耀',

    policy: [
      '仅接受支持 64 位操作系统应用。',
      '应用名每年仅支持修改 2 次，更名需提供软著。',
      '审核时效约 1–3 个工作日。'
    ]
  },
  {
    id: 'tencent',
    name: '应用宝',

    policy: [
      '软著强制但可后补（可用官网 ICP 备案截图等替代）。',
      '需发布承诺函；平台类 App 需 ICP 经营许可证。',
      '审核时效约 2–7 个工作日。'
    ]
  }
];

export function getMarket(id: string): MarketDef {
  return MARKET_DEFS.find((m) => m.id === id) ?? MARKET_DEFS[0];
}

/** 提审跟踪相关选项 */
export const ACCOUNT_STATUS = [
  { value: 'none', label: '未注册' },
  { value: 'reviewing', label: '认证中' },
  { value: 'certified', label: '已认证' }
] as const;

export const SUBMIT_STATUS = [
  { value: 'none', label: '未提交' },
  { value: 'submitted', label: '已提交' },
  { value: 'reviewing', label: '审核中' },
  { value: 'passed', label: '已通过' },
  { value: 'rejected', label: '被驳回' }
] as const;

// ===== 六市场差异对照矩阵（11+ 主题 × 6 市场）=====
import type { MarketId } from '../types';

export interface DiffCell {
  /** 0 不要求 / 1 建议 / 2 必须 */
  level: 0 | 1 | 2;
  note?: string;
}

export interface DiffRow {
  topic: string;
  cells: Partial<Record<MarketId, DiffCell>>;
}

export const DIFF_TOPICS: DiffRow[] = [
  {
    topic: '软著证书（三选一）',
    cells: {
      hw: { level: 1, note: '建议提供；版权信息上传入口在版本信息页' },
      xiaomi: { level: 2, note: '强制，三选一' },
      oppo: { level: 2, note: '强制（电子版权证书）' },
      vivo: { level: 2, note: '强制，名称须与上传应用一致' },
      honor: { level: 2, note: '更名需提供软著' },
      tencent: { level: 2, note: '强制，可后补（可用官网ICP备案截图等替代）' }
    }
  },
  {
    topic: 'APP 备案（工信部）',
    cells: {
      hw: { level: 2, note: '版本信息页“校验证件号”' },
      xiaomi: { level: 2, note: '强制' },
      oppo: { level: 2, note: '强制，未备案无法上架' },
      vivo: { level: 2, note: '强制' },
      honor: { level: 2, note: '强制' },
      tencent: { level: 2, note: '强制，2023 年 8 月起' }
    }
  },
  {
    topic: '隐私政策独立网页',
    cells: {
      hw: { level: 2, note: '分发需填隐私声明链接' },
      xiaomi: { level: 2, note: '必须可访问' },
      oppo: { level: 2, note: '需与 APP 内完全一致' },
      vivo: { level: 2, note: '明示收集规则' },
      honor: { level: 2, note: '独立 URL' },
      tencent: { level: 2, note: '与 APP 内一致' }
    }
  },
  {
    topic: '首启隐私弹窗（同意+拒绝）',
    cells: {
      hw: { level: 2, note: '需“同意/拒绝”双选项，不得默认勾选' },
      xiaomi: { level: 2 },
      oppo: { level: 2, note: '同意前零采集' },
      vivo: { level: 2, note: '首屏展示' },
      honor: { level: 2 },
      tencent: { level: 2 }
    }
  },
  {
    topic: '敏感权限逐条说明',
    cells: {
      hw: { level: 1, note: '建议按要求填写' },
      xiaomi: { level: 1, note: '权限需合理对应场景' },
      oppo: { level: 2, note: '逐条填使用场景并附功能截图' },
      vivo: { level: 2, note: '权限申请须与功能同步' },
      honor: { level: 1 },
      tencent: { level: 1 }
    }
  },
  {
    topic: '64 位架构支持',
    cells: {
      hw: { level: 2, note: '上传包需含 64 位' },
      xiaomi: { level: 1 },
      oppo: { level: 1 },
      vivo: { level: 1 },
      honor: { level: 2, note: '仅接受 64 位应用' },
      tencent: { level: 1 }
    }
  },
  {
    topic: 'AI / 深度合成标识',
    cells: {
      hw: { level: 1, note: '生成类需算法备案与标识材料' },
      xiaomi: { level: 1 },
      oppo: { level: 1 },
      vivo: { level: 2, note: '显式/隐式标识，严禁去水印' },
      honor: { level: 1 },
      tencent: { level: 1 }
    }
  },
  {
    topic: '高敏感类目第三方测试报告',
    cells: {
      hw: { level: 1, note: '特定类目要求' },
      xiaomi: { level: 2, note: '金融/医疗/新闻类需第三方报告' },
      oppo: { level: 2, note: '高敏感类目需 CMA/CNAS 报告' },
      vivo: { level: 2, note: '政策同华为' },
      honor: { level: 1 },
      tencent: { level: 1, note: '游戏/直播/支付类需安全检测报告' }
    }
  },
  {
    topic: '截图无水印（竞品/商店）',
    cells: {
      hw: { level: 2 },
      xiaomi: { level: 2, note: '不得含竞品手机水印' },
      oppo: { level: 2, note: '图标需与商店截图一致' },
      vivo: { level: 2 },
      honor: { level: 2 },
      tencent: { level: 2, note: '不得出现第三方水印' }
    }
  },
  {
    topic: '应用名改名限制',
    cells: {
      honor: { level: 2, note: '每年仅 2 次且需软著' },
      hw: { level: 1, note: '名称需与包内一致' }
    }
  },
  {
    topic: '承诺函 / 附加证明',
    cells: {
      tencent: { level: 2, note: '发布承诺函；平台类需 ICP 经营许可证' },
      hw: { level: 0 },
      xiaomi: { level: 0 },
      oppo: { level: 0 },
      vivo: { level: 0 },
      honor: { level: 0 }
    }
  },
  {
    topic: '审核周期（首次）',
    cells: {
      hw: { level: 1, note: '1–5 工作日' },
      xiaomi: { level: 1, note: '1–3 工作日' },
      oppo: { level: 1, note: '1–3 工作日' },
      vivo: { level: 1, note: '1–3 工作日' },
      honor: { level: 1, note: '1–3 工作日' },
      tencent: { level: 1, note: '2–7 工作日' }
    }
  }
];

