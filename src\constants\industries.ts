import type { IndustryDef } from '../types';

/** 首期 9 类行业品类；extraMaterialIds 关联 materialCatalog 中的行业资质材料 */
export const INDUSTRIES: IndustryDef[] = [
  {
    id: 'tool',
    name: '通用工具',
    extraMaterialIds: [],
    tips: ['纯工具类通常无专项资质，只需基础材料（软著 + 备案 + 隐私政策）。']
  },
  {
    id: 'edu',
    name: '教育',
    extraMaterialIds: ['ind_edu'],
    tips: [
      '涉及学科培训需关注前置审批；青少年保护与防沉迷要求较严（参考 PRD 附录）。',
      '以官方最新要求为准。'
    ]
  },
  {
    id: 'ai',
    name: 'AI生成',
    extraMaterialIds: ['ind_ai_alg', 'ind_ai_mark', 'ind_seval'],
    tips: [
      '生成式 AI：需互联网信息服务算法备案、AI 生成内容标识材料、安全评估报告。',
      '以官方最新要求为准。'
    ]
  },
  {
    id: 'social',
    name: '社交社区',
    extraMaterialIds: ['ind_seval'],
    tips: ['社区/聊天/交友类：需安全评估报告及监管侧通过截图；按当地要求提供。']
  },
  {
    id: 'live',
    name: '直播娱乐',
    extraMaterialIds: ['ind_wenwangwen', 'ind_seval'],
    tips: ['直播：需网络文化经营许可证（含直播/表演字样）+ 安全评估报告。']
  },
  {
    id: 'ecom',
    name: '电商购物',
    extraMaterialIds: ['ind_icp_lic'],
    tips: ['自营商城/经营性：建议办理 ICP 经营许可证（增值电信业务）。']
  },
  {
    id: 'fin',
    name: '金融理财',
    extraMaterialIds: ['ind_fin_lic'],
    tips: ['金融类需对应牌照（支付/基金/证券/小贷等），审核极严，务必先确认资质。']
  },
  {
    id: 'med',
    name: '健康医疗',
    extraMaterialIds: ['ind_med_lic'],
    tips: ['医疗/问诊/药品/器械：需医疗机构执业许可、药品/器械经营许可等。']
  },
  {
    id: 'news',
    name: '新闻资讯',
    extraMaterialIds: ['ind_news_lic'],
    tips: ['新闻类需《互联网新闻信息服务许可证》及附页；弹窗推送亦受限。']
  }
];

export function getIndustry(id: string): IndustryDef {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[0];
}
