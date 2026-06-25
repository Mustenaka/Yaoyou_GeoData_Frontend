<template>
  <n-layout has-sider class="admin-shell">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="72"
      :width="244"
      :collapsed="collapsed"
      show-trigger="bar"
      content-style="display:flex;flex-direction:column;"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="brand" :class="{ collapsed }">
        <div class="brand__logo">YY</div>
        <div v-if="!collapsed" class="brand__text">
          <strong>遥佑管理端</strong>
          <span>GeoData Console</span>
        </div>
      </div>

      <n-menu
        :options="visibleMenuOptions"
        :value="activeMenuKey"
        :collapsed="collapsed"
        :collapsed-width="72"
        :collapsed-icon-size="21"
        @update:value="onNavigate"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="topbar">
        <div class="topbar__title">{{ currentTitle }}</div>
        <n-tag size="small" :type="authStore.isSystemAdmin ? 'success' : 'info'" round>
          {{ roleLabel(authStore.roleCode) }}
        </n-tag>
        <span v-if="authStore.companyName" class="topbar__company">{{ authStore.companyName }}</span>
        <div class="topbar__spacer" />
        <span class="topbar__time mono">{{ nowText }}</span>
        <n-dropdown trigger="click" :options="dropdownOptions" @select="handleUserAction">
          <button class="user-entry" type="button">
            <span class="user-entry__avatar">{{ displayName.slice(0, 1).toUpperCase() }}</span>
            <span class="user-entry__text">
              <strong>{{ displayName }}</strong>
              <small>{{ authStore.companyName || '平台级账号' }}</small>
            </span>
          </button>
        </n-dropdown>
      </n-layout-header>

      <n-layout-content content-style="min-height: calc(100vh - 64px);">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref } from 'vue'
import { NIcon, type MenuOption } from 'naive-ui'
import {
  BusinessOutline,
  DesktopOutline,
  GridOutline,
  KeyOutline,
  LogOutOutline,
  PeopleOutline,
} from '@vicons/ionicons5'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)
const nowText = ref(new Date().toLocaleString('zh-CN', { hour12: false }))

const timer = window.setInterval(() => {
  nowText.value = new Date().toLocaleString('zh-CN', { hour12: false })
}, 1000)

const displayName = computed(() => authStore.username || '管理员')
const activeMenuKey = computed(() => String(route.name || 'dashboard'))
const currentTitle = computed(() => String(route.meta.title || '系统控制台'))

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as never) })
}

function roleLabel(role: RoleCode | '') {
  const labels: Record<string, string> = {
    system_admin: '系统管理员',
    enterprise_admin: '企业管理员',
    normal_user: '普通用户',
    trial_user: '试用用户',
    temporary_user: '临时用户',
  }
  return labels[role] || '未识别角色'
}

const menuOptions: Array<MenuOption & { roles: RoleCode[] }> = [
  { label: '系统控制台', key: 'dashboard', icon: renderIcon(GridOutline), roles: ['system_admin', 'enterprise_admin'] },
  { label: '企业管理', key: 'companies', icon: renderIcon(BusinessOutline), roles: ['system_admin', 'enterprise_admin'] },
  { label: '用户管理', key: 'users', icon: renderIcon(PeopleOutline), roles: ['system_admin', 'enterprise_admin'] },
  { label: '授权管理', key: 'licenses', icon: renderIcon(KeyOutline), roles: ['system_admin'] },
  { label: '设备管理', key: 'devices', icon: renderIcon(DesktopOutline), roles: ['system_admin', 'enterprise_admin'] },
]

const visibleMenuOptions = computed<MenuOption[]>(() =>
  menuOptions.filter((item) => item.roles.includes(authStore.roleCode as RoleCode)),
)

const dropdownOptions = [
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
]

function onNavigate(key: string) {
  router.push({ name: key })
}

async function handleUserAction(key: string) {
  if (key !== 'logout') return
  await authStore.logout()
  router.push({ name: 'login' })
}

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 65px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--yy-border);
}

.brand.collapsed {
  justify-content: center;
}

.brand__logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #1f4e79;
  color: white;
  font-weight: 700;
  letter-spacing: 0;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.brand__text strong {
  font-size: 15px;
}

.brand__text span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 20px;
  background: #fff;
}

.topbar__title {
  font-size: 16px;
  font-weight: 700;
}

.topbar__company,
.topbar__time {
  color: var(--yy-text-muted);
  font-size: 13px;
}

.topbar__spacer {
  flex: 1;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.user-entry:hover {
  background: var(--yy-fill);
}

.user-entry__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2f855a;
  color: white;
  font-weight: 700;
}

.user-entry__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.user-entry__text strong {
  font-size: 13px;
}

.user-entry__text small {
  margin-top: 3px;
  color: var(--yy-text-muted);
  font-size: 12px;
}
</style>
