# Yaoyou GeoData Frontend

遥佑土工 GeoData 管理后台前端，面向系统管理员和企业管理员提供企业、用户、授权、设备、项目档案、文件同步、Mobile/Win 数据、配置、审计、安全和运维管理界面。本项目是 Vue 3 + Vite 单页应用，生产路径挂载在 `/admin/`。

## 技术栈

- Vue 3
- Vite 7
- TypeScript
- Vue Router 4
- Pinia
- Axios
- Naive UI
- @vicons/ionicons5
- ECharts / vue-echarts

## 目录结构

```text
Yaoyou_GeoData_Frontend/
├─ public/
├─ src/
│  ├─ api/                 # Axios 请求封装和各业务 API
│  ├─ components/          # 通用页面头、统计卡片
│  ├─ composables/         # SSE 指标流等组合函数
│  ├─ layouts/             # 管理后台壳层
│  ├─ pages/               # 路由页面
│  ├─ router/              # 路由与权限守卫
│  ├─ stores/              # Pinia 登录态
│  ├─ styles/              # 全局样式变量
│  ├─ types/               # 后端响应与业务类型
│  └─ utils/               # 下载、格式化、标签、存储工具
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## 当前页面

| 路由 | 页面 | 角色 |
| --- | --- | --- |
| `/login` | 后台登录 | 公开 |
| `/dashboard` | 系统控制台 | 系统管理员、企业管理员 |
| `/companies` | 企业管理 | 系统管理员、企业管理员 |
| `/users` | 用户管理 | 系统管理员、企业管理员 |
| `/licenses` | 授权管理 | 系统管理员 |
| `/devices` | 设备管理 | 系统管理员、企业管理员 |
| `/sync-files` | 文件同步中心 | 系统管理员、企业管理员 |
| `/projects` | 项目档案 | 系统管理员、企业管理员 |
| `/mobile-data` | Mobile 数据管理 | 系统管理员、企业管理员 |
| `/win-data` | Win 数据管理 | 系统管理员、企业管理员 |
| `/configs` | 配置管理 | 系统管理员、企业管理员 |
| `/audit` | 操作记录 | 系统管理员、企业管理员 |
| `/logs/client` | 客户端日志 | 系统管理员、企业管理员 |
| `/logs/system` | 系统日志 | 系统管理员 |
| `/security/risks` | 安全风险 | 系统管理员 |
| `/security/server-time` | 服务器时间戳 | 系统管理员 |
| `/settings` | 系统设置 | 系统管理员 |

普通用户、试用用户和临时用户默认不能进入后台，业务录入入口在 Mobile 端。

## 本地运行

后端和本地依赖请先按 [后端 LOCAL_RUN.md](/D:/Work/Projects/SKY_ExcelProject/Yaoyou/Yaoyou_GeoData_Backend/LOCAL_RUN.md) 启动。

前端启动：

```powershell
cd D:\Work\Projects\SKY_ExcelProject\Yaoyou\Yaoyou_GeoData_Frontend
npm ci
npm run dev
```

默认开发地址：

- `http://127.0.0.1:3000/admin/login`

Vite 开发代理：

- `/api` -> `http://127.0.0.1:8080`
- `/ws` -> `ws://127.0.0.1:8080`

## 构建与预览

```powershell
npm run build
npm run preview
```

`vite.config.ts` 中 `base` 固定为 `/admin/`，构建产物位于 `dist/`，用于部署到 Nginx 的 `/admin/` 目录。

## 环境变量

默认 API 基址为 `/api`。如需覆盖，可在本地环境文件中设置：

```env
VITE_API_BASE=http://127.0.0.1:8080/api
```

一般本地开发不需要设置该变量，直接使用 Vite proxy 即可。

## 登录与权限

登录成功后，`src/stores/auth.ts` 会保存：

- `access_token`
- `refresh_token`
- 当前用户 ID、用户名、角色
- 企业 ID、企业名称
- 企业策略

后台可进入角色：

- `system_admin`
- `enterprise_admin`

路由守卫位于 [src/router/index.ts](/D:/Work/Projects/SKY_ExcelProject/Yaoyou/Yaoyou_GeoData_Frontend/src/router/index.ts)。未登录会跳转到 `/login`，无后台权限会清空会话并返回登录页，无页面权限会回到控制台。

## API 约定

统一请求封装位于 [src/api/request.ts](/D:/Work/Projects/SKY_ExcelProject/Yaoyou/Yaoyou_GeoData_Frontend/src/api/request.ts)。

- 默认 `baseURL` 为 `import.meta.env.VITE_API_BASE || '/api'`。
- 请求自动注入 `Authorization: Bearer <access_token>`。
- 后端统一响应 `{ code, message, data }`，前端只返回 `data`。
- `code !== 0` 会抛出 `ApiError`，错误码文案在 `errorMessages` 中维护。
- HTTP 401 会自动用 `refresh_token` 刷新 Access Token；刷新失败后清会话并跳转登录。
- 下载接口使用 `responseType: 'blob'`，不在 URL 中暴露 token。

业务 API 文件：

| 文件 | 后端模块 |
| --- | --- |
| `auth.ts` | 登录、刷新、注销、当前用户 |
| `ops.ts` | 控制台、系统设置、备份、清理 |
| `company.ts` | 企业与企业策略 |
| `user.ts` | 用户管理 |
| `license.ts` | 授权管理 |
| `device.ts` | 设备和换机申请 |
| `syncFile.ts` | 文件同步中心 |
| `archive.ts` | 项目档案、Mobile/Win 数据、配置快照 |
| `audit.ts` | 操作审计 |
| `security.ts` | 安全风险、服务器时间日志 |
| `log.ts` | 系统日志、客户端日志 |
| `project.ts` | 旧项目接口兼容 |

## 本地发布验证

本地发布验证使用前端构建产物和仓库根目录的 Nginx 配置模拟生产访问。

```powershell
cd D:\Work\Projects\SKY_ExcelProject\Yaoyou\Yaoyou_GeoData_Frontend
npm run build

docker rm -f yaoyou-local-release 2>$null
docker run -d --name yaoyou-local-release `
  -p 8081:8081 `
  -v D:\Work\Projects\SKY_ExcelProject\Yaoyou\Tools\nginx-local-release.conf:/etc/nginx/conf.d/default.conf:ro `
  -v D:\Work\Projects\SKY_ExcelProject\Yaoyou\Yaoyou_GeoData_Frontend\dist:/usr/share/nginx/html/admin:ro `
  nginx:1.27
```

验证：

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8081/admin/' -UseBasicParsing
Invoke-RestMethod -Uri 'http://127.0.0.1:8081/api/health' -Method Get
```

停止本地发布容器：

```powershell
docker rm -f yaoyou-local-release
```

## 生产部署

部署脚本位于 [Tools/deploy-frontend.sh](/D:/Work/Projects/SKY_ExcelProject/Yaoyou/Tools/deploy-frontend.sh)，核心流程：

1. 拉取 `main`。
2. 执行 `npm ci`。
3. 执行 `npm run build`。
4. 将 `dist/` 同步到 `/usr/share/nginx/html/admin/`。
5. `nginx -t` 后 reload Nginx。
6. 访问 `http://127.0.0.1/admin/` 做 smoke check。

## 验证命令

```powershell
npm ci
npm run build
```

更详细的前端阶段规划见 [Yaoyou_Document/Frontend](/D:/Work/Projects/SKY_ExcelProject/Yaoyou/Yaoyou_Document/Frontend)。
