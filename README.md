# appTs · 安卓应用市场提审工作台

多 App 独立管理安卓提审全流程的本地优先工具（纯前端，无后端/无账号，数据只存本机浏览器）。

## 技术栈
React 18 · Vite 5 · TypeScript · Ant Design v5 · IndexedDB（idb）· react-router v7（HashRouter）· react-markdown

## 运行
```bash
npm install      # 首次
npm run dev      # 开发，默认 http://localhost:5173（手机同一 Wi-Fi 可用局域网 IP 访问）
npm run build    # 产物输出 site/
npm run preview  # 预览产物，http://localhost:4173
```
普通终端直接 `npm run build` 即可；若在受控沙箱出现产物目录锁定/删除钩子超时，改用：
```bash
NODE_OPTIONS= OUT_DIR=site_new npm run build   # 输出到新目录规避旧产物占用
```

## 目录
```
docs/          PRD / 技术方案 / UI 设计规范 / 市场提审操作手册
src/content/   知识库 15 篇 Markdown
src/constants/ 静态知识（品类/材料/自查/市场差异/五阶段）
src/data/      IndexedDB 封装（appState + profile 档案、迁移、备份）
src/store/     全局状态（防抖落盘、多标签 BroadcastChannel 同步）
src/pages/     工作台 / App 详情 / 知识库 / 设置
```

## 数据说明
- 关键键：`app-submit-db.kv['appState']`（App 数据）、`kv['profile']`（主体档案，一次维护、建档自动带出）、`kv['backup-<ts>']`（自动快照，保留最近 5 份）；
- 迁移：数据版本 `PersistState.version`（仅描述 appState 形态），档案为独立键无迁移；旧备份导入兼容；
- 多标签同开：经 BroadcastChannel 同步（无本地未保存改动时重读，last-write-wins）；
- 备份：请定期「设置 → 导出 JSON」；导入前自动快照，可随时恢复。

## 常见问题
- 换浏览器/设备数据「不见」：数据在各浏览器各自存储，请用导出/导入迁移；
- 表单/记录刷新即消失：检查是否处于隐私模式（顶栏会提示「存储不可用」）；
- 后台界面路径可能随各市场改版，知识库内容均标注核实时间，以官方最新要求为准。

## 已知边界
- 本地单机工具：无云同步/无协作；行业资质内容为通用指引，不构成法律意见。
