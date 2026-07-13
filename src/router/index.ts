import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/api'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: RoleCode[]
    group?: string
    subGroup?: string
    description?: string
    plannedFlow?: string[]
    hideInMenu?: boolean
    disabled?: boolean
  }
}

const adminRoles: RoleCode[] = ['superadmin', 'admin', 'enterprise_admin']
const superRoles: RoleCode[] = ['superadmin']
const contentRoles: RoleCode[] = ['superadmin', 'admin']

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '后台登录', requiresAuth: false },
  },
  {
    path: '/apply',
    name: 'apply',
    component: () => import('@/pages/apply/index.vue'),
    meta: { title: '开通申请', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    redirect: { name: 'dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: '系统控制台', roles: adminRoles },
      },
      {
        path: 'companies',
        name: 'companies',
        component: () => import('@/pages/company/index.vue'),
        meta: { title: '企业管理', roles: adminRoles },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/user/index.vue'),
        meta: { title: '用户管理', roles: adminRoles },
      },
      {
        path: 'registration/applications',
        name: 'registration-applications',
        component: () => import('@/pages/registration/index.vue'),
        meta: { title: '注册申请', roles: adminRoles },
      },
      {
        path: 'content/site-home',
        name: 'content-site-home',
        component: () => import('@/pages/content/site-home.vue'),
        meta: { title: '官网首页文案', group: '内容管理', roles: contentRoles },
      },
      {
        path: 'content/mobile-support',
        name: 'content-mobile-support',
        component: () => import('@/pages/content/mobile-support.vue'),
        meta: { title: '技术支持页文案', group: '内容管理', roles: contentRoles },
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/pages/project-archive/index.vue'),
        meta: { title: '项目与数据记录', group: '移动端项目与数据', roles: adminRoles },
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('@/pages/project-archive/detail.vue'),
        meta: { title: '项目详情', group: '移动端项目与数据', hideInMenu: true, roles: adminRoles },
      },
      {
        path: 'mobile/global-config',
        name: 'mobile-global-config',
        component: () => import('@/pages/global-config/index.vue'),
        meta: { title: '全局配置记录', group: '移动端项目与数据', roles: adminRoles },
      },
      {
        path: 'mobile/feature-settings',
        name: 'mobile-feature-settings',
        component: () => import('@/pages/mobile-feature/index.vue'),
        meta: { title: '移动端功能设置', group: '移动端项目与数据', roles: ['superadmin', 'admin'] },
      },
      {
        path: 'mobile/config/smart-fill',
        name: 'mobile-smart-fill-config',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: {
          title: '智能填充配置',
          group: '移动端项目与数据',
          subGroup: '配置分发',
          roles: contentRoles,
          description: '预留智能填充配置分发入口，后续用于从 Excel 解析配置、发布范围并供移动端主动下拉覆盖本机同名配置。',
          plannedFlow: ['上传 Excel', '后台解析', '发布到全网或指定企业', '移动端下拉覆盖本机同名配置'],
        },
      },
      {
        path: 'mobile/config/equipment',
        name: 'mobile-equipment-config',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: {
          title: '器械管理配置',
          group: '移动端项目与数据',
          subGroup: '配置分发',
          roles: contentRoles,
          description: '预留器械管理配置分发入口，后续用于统一维护器械配置版本并按企业隔离下发。',
          plannedFlow: ['上传 Excel', '后台解析', '发布到全网或指定企业', '移动端下拉覆盖本机同名配置'],
        },
      },
      {
        path: 'mobile/collab/settings',
        name: 'mobile-collab-settings',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: {
          title: '协作设置',
          group: '移动端项目与数据',
          subGroup: '协作设置与授权',
          roles: contentRoles,
        },
      },
      {
        path: 'mobile/collab/sdk',
        name: 'mobile-collab-sdk',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: {
          title: '授权协作 SDK',
          group: '移动端项目与数据',
          subGroup: '协作设置与授权',
          roles: contentRoles,
        },
      },
      {
        path: 'mobile/logs',
        name: 'mobile-logs',
        component: () => import('@/pages/mobile-logs/index.vue'),
        meta: { title: '日志', group: '移动端项目与数据', roles: adminRoles },
      },
      {
        path: 'mobile/global-config/:id',
        name: 'global-config-detail',
        component: () => import('@/pages/global-config/detail.vue'),
        meta: { title: '全局配置详情', group: '移动端项目与数据', hideInMenu: true, roles: adminRoles },
      },
      {
        path: 'win/sky-projects',
        name: 'win-sky',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: { title: 'SKY 项目数据记录', group: 'Win端项目与数据', roles: adminRoles, disabled: true },
      },
      {
        path: 'win/huaning-projects',
        name: 'win-huaning',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: { title: 'Huaning 项目数据记录', group: 'Win端项目与数据', roles: adminRoles, disabled: true },
      },
      {
        path: 'win/global-config',
        name: 'win-global-config',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: { title: '全局配置记录', group: 'Win端项目与数据', roles: adminRoles, disabled: true },
      },
      {
        path: 'win/logs',
        name: 'win-logs',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: { title: '日志', group: 'Win端项目与数据', roles: adminRoles, disabled: true },
      },
      {
        path: 'win/other',
        name: 'win-other',
        component: () => import('@/pages/placeholder/ComingSoon.vue'),
        meta: { title: '其他', group: 'Win端项目与数据', roles: adminRoles, disabled: true },
      },
      {
        path: 'sync-files',
        name: 'sync-files',
        component: () => import('@/pages/sync-file/index.vue'),
        meta: { title: '文件同步中心', roles: superRoles },
      },
      {
        path: 'licenses',
        name: 'licenses',
        redirect: (to) => {
          const query = { ...to.query }
          const clientType = query.client_type || query.product_code
          delete query.product_code
          delete query.entitlement_id
          delete query.owner_user_id
          delete query.user_id
          delete query.legacy_authorization_id
          return {
            name: 'devices',
            query: {
              ...query,
              client_type: clientType,
            },
          }
        },
        meta: { title: '授权设备', group: '授权与设备', roles: adminRoles, hideInMenu: true },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/pages/device/index.vue'),
        meta: { title: '授权设备', group: '授权与设备', roles: adminRoles },
      },
      {
        path: 'devices/risks',
        name: 'device-risks',
        component: () => import('@/pages/device/risks.vue'),
        meta: { title: '风险设备', group: '授权与设备', roles: adminRoles },
      },
      {
        path: 'devices/authorization-requests',
        name: 'device-authorization-requests',
        component: () => import('@/pages/device/authorization-requests.vue'),
        meta: { title: '授权审批', group: '授权与设备', roles: adminRoles },
      },
      {
        path: 'devices/change-requests',
        name: 'device-change-requests',
        redirect: { name: 'device-authorization-requests' },
        meta: { title: '授权审批', group: '授权与设备', roles: adminRoles, hideInMenu: true },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/pages/audit/index.vue'),
        meta: { title: '操作记录', roles: adminRoles },
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/pages/about/index.vue'),
        meta: { title: '系统信息', roles: adminRoles },
      },
      {
        path: 'release-notes',
        name: 'release-notes',
        component: () => import('@/pages/release-notes/index.vue'),
        meta: { title: '版本更新日志', roles: adminRoles },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/index.vue'),
        meta: { title: '基本设置', group: '系统设置', roles: superRoles },
      },
      {
        path: 'settings/mail',
        name: 'mail-settings',
        component: () => import('@/pages/settings/mail.vue'),
        meta: { title: '邮件系统', group: '系统设置', roles: superRoles },
      },
      {
        path: 'settings/system-logs',
        name: 'system-logs',
        component: () => import('@/pages/settings/system-logs.vue'),
        meta: { title: '系统日志', group: '系统设置', roles: superRoles },
      },
      {
        path: 'settings/risks',
        name: 'risks',
        component: () => import('@/pages/settings/risks.vue'),
        meta: { title: '安全风险', group: '系统设置', roles: adminRoles },
      },
      {
        path: 'settings/server-time',
        name: 'server-time',
        component: () => import('@/pages/settings/server-time.vue'),
        meta: { title: '服务器时间戳', group: '系统设置', roles: superRoles },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  document.title = `${String(to.meta.title || '后台管理')} - 垚无忧土工数据管理系统`
  const auth = useAuthStore()

  if (to.meta.requiresAuth === false) {
    return auth.isLoggedIn && to.name === 'login' ? { name: 'dashboard' } : true
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.roleCode) {
    try {
      await auth.fetchMe()
    } catch {
      auth.clearSession()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  if (!auth.canEnterAdmin) {
    auth.clearSession()
    return { name: 'login' }
  }

  const roles = to.meta.roles
  if (roles?.length && !roles.includes(auth.roleCode as RoleCode)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
