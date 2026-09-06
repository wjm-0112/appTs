import type { ChecklistDef } from '../types';

const G1 = '资质与备案';
const G2 = '包体技术';
const G3 = '隐私合规';
const G4 = '素材与文案';
const G5 = '提审信息';

/** 32 项自查模板（五组）。id 稳定，升级只增不改。 */
export const SELFCHECK_DEFS: ChecklistDef[] = [
  // G1 资质与备案（7）
  { id: 'sc01', group: G1, text: '软著证书已下证（三证任选其一）' },
  { id: 'sc02', group: G1, text: '著作权人 = 开发者账号主体，且 APP 名 = 软著名 = 备案名' },
  { id: 'sc03', group: G1, text: '转授权链条完整（软著非本主体持有时）' },
  { id: 'sc04', group: G1, text: '后端服务域名已完成 ICP 备案' },
  { id: 'sc05', group: G1, text: '工信部 APP 备案号已下发' },
  { id: 'sc06', group: G1, text: '备案的包名 / 公钥 / 证书 MD5 与上架包体一致' },
  { id: 'sc07', group: G1, text: '行业专项资质齐全且在有效期内' },

  // G2 包体技术（6）
  { id: 'sc08', group: G2, text: '使用 Release 正式签名，非 debug 签名' },
  { id: 'sc09', group: G2, text: '包体支持 64 位架构' },
  { id: 'sc10', group: G2, text: 'targetSdkVersion 满足各市场要求' },
  { id: 'sc11', group: G2, text: '主流机型无崩溃 / 闪退 / ANR' },
  { id: 'sc12', group: G2, text: '提审的是最新版，应用内无更新提示' },
  { id: 'sc13', group: G2, text: '无隐藏图标、捆绑下载、恶意自启动' },

  // G3 隐私合规（8）
  { id: 'sc14', group: G3, text: '隐私政策为独立可访问网页，非本地文本或图片' },
  { id: 'sc15', group: G3, text: '首启弹窗明示隐私政策，含同意与拒绝双选项' },
  { id: 'sc16', group: G3, text: '同意前 APP 与第三方 SDK 均不采集设备标识符' },
  { id: 'sc17', group: G3, text: '敏感权限仅在用户使用对应功能时动态申请' },
  { id: 'sc18', group: G3, text: '拒绝权限后仍可用基础功能、不退出' },
  { id: 'sc19', group: G3, text: '隐私政策含第三方 SDK 清单与系统权限清单' },
  { id: 'sc20', group: G3, text: '提供账号注销、撤回同意、删除个人信息入口' },
  { id: 'sc21', group: G3, text: '注销时限 ≤15 个工作日，且有投诉举报渠道' },

  // G4 素材与文案（5）
  { id: 'sc22', group: G4, text: '图标 512×512 PNG，与实际安装图标一致' },
  { id: 'sc23', group: G4, text: '截图 3–5 张，无竞品手机外框与其他商店水印' },
  { id: 'sc24', group: G4, text: '截图 / 视频内容与实际功能相符' },
  { id: 'sc25', group: G4, text: '简介无「最 / 第一 / 国家级」等违禁词' },
  { id: 'sc26', group: G4, text: '应用信息中不含其他终端品牌或应用市场名称' },

  // G5 提审信息（6）
  { id: 'sc27', group: G5, text: '测试账号可用，备注写明登录步骤' },
  { id: 'sc28', group: G5, text: '支付 / 实名 / 审核类功能有可走通的演示路径' },
  { id: 'sc29', group: G5, text: '敏感权限逐条填写场景并附功能截图（OPPO/vivo）' },
  { id: 'sc30', group: G5, text: '版权证明与备案信息已上传并通过备案校验' },
  { id: 'sc31', group: G5, text: '分类、内容分级、年龄分级已如实填写' },
  { id: 'sc32', group: G5, text: '已备客服联系方式与运营主体信息' }
];

export const CHECKLIST_GROUPS = [G1, G2, G3, G4, G5];
