import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/api'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: RoleCode[]
    group?: string
    hideInMenu?: boolean
    disabled?: boolean
  }
}

const adminRoles: RoleCode[] = ['superadmin', 'admin', 'enterprise_admin']
const superRoles: RoleCode[] = ['superadmin']

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
        component: () => import('@/pages/license/index.vue'),
        meta: { title: '授权管理', group: '授权与设备', roles: adminRoles },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/pages/device/index.vue'),
        meta: { title: '设备管理', group: '授权与设备', roles: adminRoles },
      },
      {
        path: 'devices/change-requests',
        name: 'device-change-requests',
        component: () => import('@/pages/device/index.vue'),
        meta: { title: '换机申请', group: '授权与设备', roles: adminRoles },
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
        meta: { title: '安全风险', group: '系统设置', roles: superRoles },
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
