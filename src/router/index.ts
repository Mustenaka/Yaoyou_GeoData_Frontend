import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/api'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: RoleCode[]
  }
}

const adminRoles: RoleCode[] = ['system_admin', 'enterprise_admin']

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '后台登录', requiresAuth: false },
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
        path: 'licenses',
        name: 'licenses',
        component: () => import('@/pages/license/index.vue'),
        meta: { title: '授权管理', roles: ['system_admin'] },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/pages/device/index.vue'),
        meta: { title: '设备管理', roles: adminRoles },
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
  document.title = `${String(to.meta.title || '后台管理')} - 遥佑 GeoData`
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
