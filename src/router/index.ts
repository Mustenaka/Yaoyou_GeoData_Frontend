import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: 'SKY 管理端登录', requiresAuth: false },
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
        meta: { title: '系统控制台' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/user/index.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/pages/device/index.vue'),
        meta: { title: '设备授权' },
      },
      {
        path: 'collab',
        name: 'collab',
        component: () => import('@/pages/collab/index.vue'),
        meta: { title: '协作监控' },
      },
      {
        path: 'logs/system',
        name: 'logs-system',
        component: () => import('@/pages/log/system.vue'),
        meta: { title: '系统日志' },
      },
      {
        path: 'logs/client',
        name: 'logs-client',
        component: () => import('@/pages/log/client.vue'),
        meta: { title: '客户端日志' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/index.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'dashboard' },
  },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

router.beforeEach((to) => {
  document.title = String(to.meta.title || 'SKY 管理系统')
  const authStore = useAuthStore()

  if (to.meta.requiresAuth === false) {
    if (authStore.isLoggedIn && to.name === 'login') {
      return { name: 'dashboard' }
    }
    return true
  }

  if (!authStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!authStore.isAdmin) {
    authStore.clearSession()
    return { name: 'login' }
  }

  return true
})

export default router
