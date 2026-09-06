import type { MaterialDef, MarketId } from '../types';

/**
 * 材料目录：通用基线（按条件项含其中，常规净约 21 项）+ 行业追加项。
 * 快照 = 基线非可选 + 该行业 extra（可选行业资质按品类纳入）。
 * id 为稳定标识：模板升级按 id「新增合并、永不覆盖」用户进度。
 */
export const MATERIAL_DEFS: MaterialDef[] = [
  // —— 主体 ——
  { id: 'entity_license', name: '营业执照（三证合一）', category: '主体', stage: 'qual', desc: '经营范围含软件开发/信息技术服务/互联网信息服务；电商付费建议含增值电信业务' },
  { id: 'entity_legal_id', name: '法人身份证正反面', category: '主体', stage: 'qual' },
  { id: 'entity_bank', name: '对公账户信息', category: '主体', stage: 'qual', desc: '小米需打款验证；开通内购/支付必备' },
  { id: 'entity_auth', name: '经办人授权书', category: '主体', stage: 'qual', desc: '非法人办理时提供', optional: true },

  // —— 知产 ——
  { id: 'ip_copyright', name: '软著登记证书（三选一）', category: '知产', stage: 'qual', needCertNo: true, desc: '软著/APP电子版权/软著认证三选一；著作权人=主体', requiredMarkets: ['xiaomi', 'oppo', 'vivo', 'honor', 'tencent'] },
  { id: 'ip_license_file', name: '软著转授权文件', category: '知产', stage: 'qual', desc: '软著非自有主体持有时提供完整授权链', optional: true },

  // —— 备案 ——
  { id: 'filing_icp', name: '域名 ICP 备案', category: '备案', stage: 'qual', needCertNo: true, desc: '后端域名+国内服务器；APP 备案前置' },
  { id: 'filing_app', name: '工信部 APP 备案', category: '备案', stage: 'qual', needCertNo: true, desc: '2023 起强制；包名/公钥/证书MD5 须与上架包一致' },
  { id: 'filing_privacy', name: '隐私政策网页上线', category: '备案', stage: 'qual', needUrl: true, desc: '独立可访问 URL，内容与 APP 内一致' },
  { id: 'filing_promise', name: 'APP 备案承诺书', category: '备案', stage: 'qual', desc: '接入商平台下载模板' },
  { id: 'filing_police', name: '公安联网备案', category: '备案', stage: 'qual', needCertNo: true, desc: '联网运行 30 日内于 beian.mps.gov.cn 完成' },

  // —— 包体技术 ——
  { id: 'tech_release_signing', name: 'Release 正式签名确认', category: '包体', stage: 'tech', desc: '不能用 debug 签名' },
  { id: 'tech_64bit', name: '支持 64 位架构', category: '包体', stage: 'tech' },
  { id: 'tech_targetsdk', name: 'targetSdk 达标（≥30）', category: '包体', stage: 'tech' },
  { id: 'tech_stability', name: '主流机型无崩溃/闪退', category: '包体', stage: 'tech', desc: '含 ANR、兼容性验证' },
  { id: 'tech_latest', name: '提审最新版确认', category: '包体', stage: 'tech', desc: '应用内不得提示更新版本' },

  // —— 应用信息 ——
  { id: 'asset_icon', name: '应用图标 512×512 PNG', category: '应用信息', stage: 'tech' },
  { id: 'asset_screenshots', name: '应用截图 3–5 张', category: '应用信息', stage: 'tech', desc: '1080×1920，无水印无竞品外框' },
  { id: 'asset_tagline', name: '一句话简介与关键词', category: '应用信息', stage: 'tech', desc: '注意各市场字数限制' },
  { id: 'asset_desc', name: '详细简介与版本特性', category: '应用信息', stage: 'tech', desc: '禁极限词' },
  { id: 'asset_classify', name: '分类 / 内容分级 / 年龄分级', category: '应用信息', stage: 'tech' },
  { id: 'asset_permissions', name: '敏感权限使用说明', category: '应用信息', stage: 'tech', desc: 'OPPO/vivo 需逐条场景+截图' },
  { id: 'asset_test_account', name: '测试账号与操作路径', category: '应用信息', stage: 'tech', desc: '涉及登录/支付/审核功能时', optional: true },
  { id: 'asset_contact', name: '客服与运营主体信息', category: '应用信息', stage: 'tech' },

  // —— 行业追加（由 industries.ts 按品类引用）——
  { id: 'ind_edu', name: '教育行业前置资质/提示', category: '备案', stage: 'qual', optional: true, desc: '学科培训前置审批；以官方最新要求为准' },
  { id: 'ind_ai_alg', name: '互联网信息服务算法备案', category: '备案', stage: 'qual', needCertNo: true, desc: '生成合成类；beian.cac.gov.cn 查询' },
  { id: 'ind_ai_mark', name: 'AI 生成内容标识材料', category: '备案', stage: 'qual', desc: '显式/隐式标识，含元数据标识说明' },
  { id: 'ind_seval', name: '安全评估报告（监管侧通过截图）', category: '备案', stage: 'qual', desc: 'beian.mps.gov.cn 提交并保留审核通过截图' },
  { id: 'ind_wenwangwen', name: '网络文化经营许可证', category: '备案', stage: 'qual', needCertNo: true, desc: '含“直播/表演”字样' },
  { id: 'ind_icp_lic', name: 'ICP 经营许可证', category: '备案', stage: 'qual', needCertNo: true, desc: '经营性互联网信息服务' },
  { id: 'ind_fin_lic', name: '金融业务牌照/许可', category: '备案', stage: 'qual', needCertNo: true, desc: '按业务类型（支付/基金/证券/小贷等）' },
  { id: 'ind_med_lic', name: '医疗健康专项许可', category: '备案', stage: 'qual', needCertNo: true, desc: '执业许可/药品/器械经营许可等' },
  { id: 'ind_news_lic', name: '互联网新闻信息服务许可证', category: '备案', stage: 'qual', needCertNo: true, desc: '含附页' }
];

const MAP = new Map(MATERIAL_DEFS.map((d) => [d.id, d]));

export function getMaterialDef(id: string): MaterialDef | undefined {
  return MAP.get(id);
}

export const MATERIAL_CATEGORIES: MaterialDef['category'][] = ['主体', '知产', '备案', '包体', '应用信息'];

/** 用于 requiredMarkets 角标的可读市场名 */
export const MARKET_NAME: Record<MarketId, string> = {
  hw: '华为',
  xiaomi: '小米',
  oppo: 'OPPO',
  vivo: 'vivo',
  honor: '荣耀',
  tencent: '应用宝'
};
