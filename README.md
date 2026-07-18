# 垚无忧土工数据管理系统 · Frontend

本仓库同时包含两套前端产物：

- 管理后台：Vue 3 单页应用，生产路径为 `/admin/`。
- 官网首页：原生 TypeScript/CSS 页面，生产路径为 `/`。

当前事实快照：2026-07-10，Frontend `main` HEAD `308adc6`，`package.json` 版本 `0.1.0`。功能状态以当前代码、后端契约和真实浏览器结果为准，旧规划文档不作为实现证据。

## 技术栈

- Vue 3.5、Vue Router 4、Pinia 3
- Vite 7、TypeScript 5.9
- Naive UI、`@vicons/ionicons5`
- Axios
- ECharts / vue-echarts
- grid-layout-plus（控制台可拖拽布局）
- VueUse

## 仓库结构

```text
Yaoyou_GeoData_Frontend/
├─ src/                    # 管理后台
│  ├─ api/                 # Axios 封装与业务 API
│  ├─ components/          # 通用页头、统计卡、控制台面板
│  ├─ composables/         # 遗留 SSE 组合函数；当前正式页面未引用
│  ├─ layouts/             # 后台壳层、菜单、主题与改密入口
│  ├─ pages/               # 后台与公开申请页
│  ├─ router/              # 路由、角色元数据与导航守卫
│  ├─ stores/              # 登录态、主题
│  ├─ styles/              # 全局样式与主题变量
│  ├─ types/               # API/业务类型
│  └─ utils/               # 标签、格式化、下载、快照解析等
├─ site/                   # 官网源码
│  ├─ public/assets/       # 官网内置图片
│  └─ src/                 # 官网 TypeScript 与 CSS
├─ dist/                   # 管理后台构建产物（不作为源码事实）
├─ site-dist/              # 官网构建产物（不作为源码事实）
├─ package.json
├─ vite.config.ts          # 管理后台构建配置
└─ vite.site.config.ts     # 官网构建配置
```

## npm 命令

| 命令 | 作用 | 默认地址/产物 |
| --- | --- | --- |
| `npm run dev` | 启动管理后台开发服务 | `http://127.0.0.1:3000/admin/` |
| `npm run dev:site` | 启动官网开发服务 | `http://127.0.0.1:3001/` |
| `npm run build` | `tsc && vite build` | `dist/` |
| `npm run build:site` | 构建官网 | `site-dist/` |
| `npm run preview` | 预览管理后台构建产物 | Vite preview 地址 |

仓库当前没有 `test`、`lint` 或端到端测试脚本，也没有 Vitest/Jest/Playwright/Cypress 测试框架。`npm run build` 与 `npm run build:site` 只能证明类型检查和构建通过，页面改动还必须在真实浏览器核对渲染、Console、Network、权限和交互。

## 当前角色与后台准入

当前角色码只有：

| 角色码 | 显示名 | 后台准入 |
| --- | --- | --- |
| `superadmin` | 技术超级管理员 | 是，全局与系统运维能力 |
| `admin` | 普通管理员 | 是，平台业务管理能力 |
| `enterprise_admin` | 企业管理员 | 是，前端收敛部分操作，数据范围最终由后端企业隔离 |
| `normal_user` | 普通用户 | 否 |
| `temporary_user` | 临时用户 | 否 |

`src/stores/auth.ts` 会把一个仅用于历史本地会话兼容的管理员值归一为 `superadmin`；当前路由、类型和页面只使用上表角色码。管理后台准入由 `canEnterAdmin` 控制；页面/菜单再按 `route.meta.roles` 过滤。前端隐藏不是安全边界，后端仍必须执行角色和企业范围校验。

## 当前路由与实现状态

### 公开页面

| 路由 | 状态 | 说明 |
| --- | --- | --- |
| `/login` | 已实现 | 管理后台登录；只有三个管理员角色可继续进入后台 |
| `/apply` | 已实现 | 企业/个人开通申请；个人可选目标企业或无企业，角色为普通用户/临时用户 |

### 后台页面

下表中的“平台管理员”指 `superadmin` + `admin`，“三类管理员”再包含 `enterprise_admin`。

| 菜单/路由 | 可见角色 | 当前边界 |
| --- | --- | --- |
| 系统控制台 `/dashboard` | 三类管理员 | REST 摘要、近期事件、审计；平台管理员可看 REST 服务器指标，只有 `superadmin` 可看容量 |
| 企业管理 `/companies` | 三类管理员 | 资料、有效期、状态、策略、导出；创建/启停仅平台管理员，企业范围由后端裁剪 |
| 用户管理 `/users` | 三类管理员 | 角色范围按当前管理员收敛，支持有效期、产品权限、重置密码、导出 |
| 注册申请 `/registration/applications` | 三类管理员 | 编辑、审批、拒绝；企业申请可批量创建账号，个人申请可分配企业/管理人 |
| 内容管理 `/content/site-home` | 平台管理员 | 官网首屏和两张应用卡片的文案、站内图片上传与预览 |
| 内容管理 `/content/mobile-support` | 平台管理员 | 移动端登录页技术支持纯文本 |
| 移动端项目与数据 `/projects` | 三类管理员 | 企业 → 设备 → 项目档案与关键词检索 |
| 项目详情 `/projects/:id` | 三类管理员 | 基本信息、项目配置、开土记录快照、导出、项目生命周期展示与撤销彻底删除 |
| 全局配置记录 `/mobile/global-config` | 三类管理员 | 企业 → 设备 → 该设备全局配置版本；详情为隐藏路由 `/mobile/global-config/:id` |
| 移动端功能设置 `/mobile/feature-settings` | 平台管理员 | 智能填充“查看入口”全局/企业隐藏策略，不删除数据也不禁用填充执行 |
| 智能填充配置、器械管理配置 | 平台管理员 | 可进入的 ComingSoon 占位页，尚无上传、解析或分发实现 |
| 协作设置、授权协作 SDK | 平台管理员 | 可进入的 ComingSoon 占位页，历史协作页未挂载 |
| 移动端日志 `/mobile/logs` | 三类管理员 | 固定 `client_type=mobile`，按运行日志/操作记录及设备/账号分组 |
| Win 端项目与数据 `/win/sky-projects`、`/win/huaning-projects` | 三类管理员 | 只读查看由 `.sky` / `.Huaning` 归集创建的项目及其有界数据源预览；不提供下载、编辑或删除 |
| Win 日志 `/win/logs` | 三类管理员 | 固定 `client_type=win`，复用客户端日志视图；日志不受 Win 功能开关影响 |
| Win 功能设置 `/win/features` | 平台管理员 | SKY / Huaning 项目云归集接口的全局与企业级停用策略；最终拒绝由后端执行 |
| 文件同步中心 `/sync-files` | `superadmin` | 全量文件查询、详情、下载、项目跳转、重解析、删除 |
| 授权管理 `/licenses` | 三类管理员 | 企业管理员只读；平台管理员可发放、调整、撤销单条授权 |
| 设备管理 `/devices` | 三类管理员 | Mobile/Win 台账、详情、状态、阻断、撤销本机全部授权；后端负责最终范围/动作校验 |
| 风险设备 `/devices/risks` | 三类管理员 | 设备聚合风险；企业管理员可标记处理，封号/封设备只对平台管理员显示 |
| 授权审批 `/devices/authorization-requests` | 三类管理员 | 新增设备/换机审批和加密导出信息代加设备；企业管理员目标用户限定本企业 |
| 操作记录 `/audit` | 三类管理员 | 操作审计 + `client_log` 文件标签页 |
| 系统信息 `/about` | 三类管理员 | 前端版本/构建时间与后端 `/health`、`/version` 信息 |
| 版本更新日志 `/release-notes` | 三类管理员 | 只读解析仓库 `CHANGELOG.md`，不是后端可编辑发布系统 |
| 基本设置、邮件系统、系统日志、服务器时间戳 | `superadmin` | 系统级运维能力 |
| 安全风险 `/settings/risks` | 三类管理员 | 事件流详情与处理/阻断/解除；企业筛选只对平台管理员显示 |

## 关键实现边界

- 控制台正式指标来自 `/api/admin/dashboard/*` REST 接口。`src/composables/useMetricsSSE.ts` 虽仍存在，但没有被当前页面引用，不能据此宣称 SSE 已接入。
- `src/pages/collab/index.vue` 与 `src/api/project.ts` 是未挂入当前正式信息架构的遗留文件，不能视为已上线功能。
- Win 端项目、数据源、日志与功能设置均为只读/策略管理入口；不记录 Win 全局配置，也不提供 Win 数据回写、下载、编辑或删除。智能填充配置、器械配置、协作设置和协作 SDK 仍为可点击 ComingSoon 占位。
- 项目档案与全局配置记录是云端上行数据的查看、结构化展示和导出入口；当前页面没有配置下发、在线协同或写回客户端链路。
- 版本更新日志来自构建时打包的 `CHANGELOG.md`；`package.json` 版本经 Vite 注入系统信息页。

## 本地运行

```powershell
cd D:\Work\Projects\SKY_ExcelProject\Yaoyou\Yaoyou_GeoData_Frontend
npm ci
npm run dev
```

管理后台开发代理：

- `/api` → `http://127.0.0.1:8080`
- `/ws` → `ws://127.0.0.1:8080`（当前正式后台页面没有使用历史协作 WebSocket）

官网开发：

```powershell
npm run dev:site
```

官网只代理 `/api` 到 `http://127.0.0.1:8080`。

## API 与会话约定

统一请求封装位于 `src/api/request.ts`：

- `baseURL = import.meta.env.VITE_API_BASE || '/api'`。
- 请求自动附加 `Authorization: Bearer <access_token>`。
- 统一解包 `{ code, message, data }`；非零业务码抛出 `ApiError`。
- HTTP 401 使用 Refresh Token 单飞刷新并重放队列；失败后清理会话并跳转 `/admin/login`。
- 文件下载使用 blob，不把 token 放进 URL。
- 当前请求超时为 20 秒。

会话落在 localStorage，包含 Access/Refresh Token、用户、角色、企业、强制改密标记、派生权限列表和策略。派生 `permissions` 当前不参与路由判定，路由守卫以 `roleCode` 和 `meta.roles` 为准。

## 双构建与部署

```powershell
npm run build
npm run build:site
```

- 管理后台：`vite.config.ts` 固定 `base: '/admin/'`，输出 `dist/`。
- 官网：`vite.site.config.ts` 固定 `base: '/'`，输出 `site-dist/`。

`Tools/deploy-frontend.sh` 当前流程为：拉取 Frontend `main`、`npm ci`、执行两套构建、把官网同步到 `/usr/share/nginx/html/`（保留 `/admin/`）、把后台同步到 `/usr/share/nginx/html/admin/`、检查并重载 Nginx，最后分别 smoke check `/` 与 `/admin/`。

## 验收要求

文档或纯文本改动至少执行：

```powershell
npm run build
npm run build:site
git diff --check
```

涉及页面、路由、角色、响应式样式、下载或交互时，还必须用真实浏览器验证：

- 目标角色的菜单可见性与直达 URL 守卫；
- 页面真实渲染、弹窗/抽屉/表格/下载交互；
- Console 无新增 error/warning；
- Network 请求路径、参数和响应正确；
- 至少检查桌面与窄屏布局；
- 不把占位页、未引用文件或仅构建通过报告成已完成能力。

详细现状文档见 `Yaoyou_Document/Frontend/`。
