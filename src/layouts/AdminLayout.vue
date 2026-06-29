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
          <strong>垚无优土工数据管理系统</strong>
          <span>Yaowuyou</span>
        </div>
      </div>

      <n-menu
        :options="visibleMenuOptions"
        :value="activeMenuKey"
        :collapsed="collapsed"
        :collapsed-width="72"
        :collapsed-icon-size="21"
        :expanded-keys="expandedKeys"
        @update:value="onNavigate"
        @update:expanded-keys="expandedKeys = $event"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="topbar">
        <div class="topbar__heading">
          <div class="topbar__title">{{ currentTitle }}</div>
          <n-breadcrumb v-if="breadcrumbs.length > 1" class="topbar__breadcrumb">
            <n-breadcrumb-item v-for="item in breadcrumbs" :key="item">{{ item }}</n-breadcrumb-item>
          </n-breadcrumb>
        </div>
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
import { computed, h, onBeforeUnmount, ref, watch } from 'vue'
import { NIcon, type MenuOption } from 'naive-ui'
import {
  AlertCircleOutline,
  BusinessOutline,
  CloudUploadOutline,
  DesktopOutline,
  DocumentTextOutline,
  FileTrayFullOutline,
  FolderOpenOutline,
  GridOutline,
  KeyOutline,
  ListOutline,
  LogOutOutline,
  PeopleOutline,
  SettingsOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import type { RouteRecordRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)
const expandedKeys = ref<string[]>([])
const nowText = ref(new Date().toLocaleString('zh-CN', { hour12: false }))

const timer = window.setInterval(() => {
  nowText.value = new Date().toLocaleString('zh-CN', { hour12: false })
}, 1000)

const displayName = computed(() => authStore.username || '管理员')
const currentTitle = computed(() => String(route.meta.title || '系统控制台'))
const breadcrumbs = computed(() => {
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  return group ? [group, currentTitle.value] : [currentTitle.value]
})

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

const routeIcons: Record<string, unknown> = {
  dashboard: GridOutline,
  companies: BusinessOutline,
  users: PeopleOutline,
  licenses: KeyOutline,
  devices: DesktopOutline,
  'device-change-requests': TimeOutline,
  projects: FolderOpenOutline,
  'sync-files': CloudUploadOutline,
  audit: ListOutline,
  settings: SettingsOutline,
  'system-logs': FileTrayFullOutline,
  risks: AlertCircleOutline,
  'server-time': TimeOutline,
}

const groupIcons: Record<string, unknown> = {
  授权与设备: KeyOutline,
  项目与数据: FolderOpenOutline,
  系统设置: SettingsOutline,
}

function groupKey(group: string) {
  return `group:${group}`
}

const adminChildren = computed<RouteRecordRaw[]>(() => {
  const adminRoute = router.options.routes.find((item) => item.path === '/')
  return adminRoute?.children || []
})

function canShowRoute(record: RouteRecordRaw) {
  if (!record.name || record.meta?.hideInMenu) return false
  const roles = record.meta?.roles as RoleCode[] | undefined
  return !roles?.length || roles.includes(authStore.roleCode as RoleCode)
}

const activeMenuKey = computed(() => {
  if (!route.meta.hideInMenu) return String(route.name || 'dashboard')
  const fallback = adminChildren.value.find((record) => record.meta?.group === route.meta.group && canShowRoute(record))
  return String(fallback?.name || 'dashboard')
})

const activeGroupKey = computed(() => {
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  return group ? groupKey(group) : ''
})

const visibleMenuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = []
  const groups = new Map<string, MenuOption & { children: MenuOption[] }>()

  for (const record of adminChildren.value) {
    if (!canShowRoute(record)) continue

    const key = String(record.name)
    const item: MenuOption = {
      label: String(record.meta?.title || key),
      key,
      icon: renderIcon(routeIcons[key] || DocumentTextOutline),
    }
    const group = typeof record.meta?.group === 'string' ? record.meta.group : ''

    if (!group) {
      options.push(item)
      continue
    }

    if (!groups.has(group)) {
      const groupOption: MenuOption & { children: MenuOption[] } = {
        label: group,
        key: groupKey(group),
        icon: renderIcon(groupIcons[group] || FolderOpenOutline),
        children: [],
      }
      groups.set(group, groupOption)
      options.push(groupOption)
    }

    groups.get(group)?.children.push(item)
  }

  return options
})

const dropdownOptions = [
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
]

function onNavigate(key: string) {
  if (key.startsWith('group:')) return
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

watch(
  activeGroupKey,
  (key) => {
    if (key && !expandedKeys.value.includes(key)) {
      expandedKeys.value = [...expandedKeys.value, key]
    }
  },
  { immediate: true },
)
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

.topbar__heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 180px;
}

.topbar__title {
  font-size: 16px;
  font-weight: 700;
}

.topbar__breadcrumb {
  font-size: 12px;
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
