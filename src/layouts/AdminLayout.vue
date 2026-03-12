<template>
  <n-layout has-sider style="min-height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="72"
      :width="244"
      :collapsed="collapsed"
      show-trigger="bar"
      content-style="display:flex;flex-direction:column;"
      style="background: rgba(255,255,255,0.72); backdrop-filter: blur(20px)"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="brand" :class="{ collapsed }">
        <div class="brand__logo">SKY</div>
        <div v-if="!collapsed" class="brand__text">
          <strong>后台管理端</strong>
          <span>GeoData Console</span>
        </div>
      </div>
      <n-menu
        :options="menuOptions"
        :value="activeMenuKey"
        :collapsed="collapsed"
        :collapsed-width="72"
        :collapsed-icon-size="22"
        @update:value="onNavigate"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="topbar">
        <div class="topbar__status">
          <span class="topbar__dot" />
          管理员会话有效
        </div>
        <div class="topbar__time mono">{{ nowText }}</div>
        <div class="topbar__spacer" />
        <n-dropdown :options="dropdownOptions" @select="handleUserAction">
          <div class="user-entry">
            <div class="user-entry__avatar">{{ displayName.slice(0, 1) }}</div>
            <div class="user-entry__text">
              <strong>{{ displayName }}</strong>
              <span>{{ authStore.userRole }}</span>
            </div>
          </div>
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
import { h, onBeforeUnmount, ref } from 'vue'
import { NIcon } from 'naive-ui'
import {
  AppsOutline,
  DesktopOutline,
  DocumentTextOutline,
  PeopleCircleOutline,
  PeopleOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)
const displayName = computed(() => authStore.username || '管理员')
const nowText = ref(new Date().toLocaleString('zh-CN', { hour12: false }))

const timer = window.setInterval(() => {
  nowText.value = new Date().toLocaleString('zh-CN', { hour12: false })
}, 1000)

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  { label: '系统控制台', key: 'dashboard', icon: renderIcon(AppsOutline) },
  { label: '用户管理', key: 'users', icon: renderIcon(PeopleOutline) },
  { label: '设备授权', key: 'devices', icon: renderIcon(DesktopOutline) },
  { label: '协作监控', key: 'collab', icon: renderIcon(PeopleCircleOutline) },
  {
    label: '日志管理',
    key: 'logs',
    icon: renderIcon(DocumentTextOutline),
    children: [
      { label: '系统日志', key: 'logs-system' },
      { label: '客户端日志', key: 'logs-client' },
    ],
  },
  { label: '系统设置', key: 'settings', icon: renderIcon(SettingsOutline) },
]

const dropdownOptions = [{ label: '退出登录', key: 'logout' }]

const activeMenuKey = computed(() => String(route.name || 'dashboard'))

function onNavigate(key: string) {
  router.push({ name: key })
}

async function handleUserAction(key: string) {
  if (key !== 'logout') return
  try {
    await authApi.logout()
  } catch {
    // ignore logout failure and clear local session
  }
  authStore.clearSession()
  router.push({ name: 'login' })
}

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 16px;
  border-bottom: 1px solid var(--sky-border);
}

.brand.collapsed {
  justify-content: center;
}

.brand__logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--sky-blue), var(--sky-cyan));
  color: white;
  font-family: var(--font-display);
  font-size: 14px;
  animation: glow-pulse 3s infinite;
}

.brand__text {
  display: flex;
  flex-direction: column;
}

.brand__text strong {
  font-size: 15px;
}

.brand__text span {
  font-size: 12px;
  color: var(--sky-text-muted);
}

.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 64px;
  padding: 0 20px;
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(20px);
}

.topbar__status,
.topbar__time {
  color: var(--sky-text-secondary);
  font-size: 13px;
}

.topbar__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 999px;
  background: var(--sky-green);
  animation: pulse-dot 1.6s infinite;
}

.topbar__spacer {
  flex: 1;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 14px;
  cursor: pointer;
}

.user-entry:hover {
  background: rgba(22, 119, 255, 0.06);
}

.user-entry__avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--sky-blue), var(--sky-cyan));
  color: white;
  font-weight: 700;
}

.user-entry__text {
  display: flex;
  flex-direction: column;
}

.user-entry__text span {
  font-size: 12px;
  color: var(--sky-text-muted);
  text-transform: uppercase;
}
</style>
