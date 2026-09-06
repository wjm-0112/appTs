import type { StageDef } from '../types';

export const STAGES: StageDef[] = [
  { id: 'qual', name: '资质合规', hint: '软著、备案、隐私政策等资质材料', targetTab: 'materials' },
  { id: 'account', name: '账号注册', hint: '六市场开发者账号注册认证', targetTab: 'market' },
  { id: 'tech', name: '打包自检', hint: '签名、64位、权限与隐私合规', targetTab: 'checklist' },
  { id: 'review', name: '提审跟踪', hint: '提交审核、处理驳回', targetTab: 'market' },
  { id: 'launch', name: '上架维护', hint: '发布、版本迭代与变更手续', targetTab: 'market' }
];
