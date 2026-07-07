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
          <strong>垚无忧土工数据管理系统</strong>
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
        <n-tag size="small" :type="authStore.isSuperAdmin ? 'success' : 'info'" round>
          {{ roleLabel(authStore.roleCode) }}
        </n-tag>
        <span v-if="authStore.companyName" class="topbar__company">{{ authStore.companyName }}</span>
        <div class="topbar__spacer" />
        <n-dropdown trigger="click" :options="themeOptions" @select="handleThemeSelect">
          <n-button quaternary circle :title="`主题：${themeStore.modeLabel}`">
            <template #icon>
              <n-icon :component="themeIcon" />
            </template>
          </n-button>
        </n-dropdown>
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

  <n-modal
    v-model:show="passwordModalVisible"
    preset="card"
    title="修改密码"
    style="width: 420px"
    :closable="!authStore.mustChangePassword"
    :mask-closable="!authStore.mustChangePassword"
    :close-on-esc="!authStore.mustChangePassword"
  >
    <n-form ref="passwordFormRef" :model="passwordForm" :rules="changePasswordRules" label-placement="top">
      <n-form-item label="当前密码" path="current_password">
        <n-input v-model:value="passwordForm.current_password" type="password" show-password-on="click" />
      </n-form-item>
      <n-form-item label="新密码" path="new_password">
        <n-input
          :value="passwordForm.new_password"
          type="password"
          show-password-on="click"
          :placeholder="passwordPolicyText"
          @update:value="handleNewPasswordUpdate"
        />
      </n-form-item>
      <n-form-item label="确认新密码" path="confirm_password">
        <n-input
          :value="passwordForm.confirm_password"
          type="password"
          show-password-on="click"
          :placeholder="passwordPolicyText"
          @update:value="handleConfirmPasswordUpdate"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button v-if="!authStore.mustChangePassword" @click="passwordModalVisible = false">取消</n-button>
        <n-button type="primary" :loading="passwordSaving" @click="submitPasswordChange">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { NIcon, useMessage, type FormInst, type FormRules, type MenuOption } from 'naive-ui'
import {
  AlertCircleOutline,
  BusinessOutline,
  CloudUploadOutline,
  DesktopOutline,
  DocumentTextOutline,
  FileTrayFullOutline,
  FolderOpenOutline,
  GridOutline,
  InformationCircleOutline,
  KeyOutline,
  ListOutline,
  LogOutOutline,
  MailOutline,
  MoonOutline,
  OptionsOutline,
  PeopleOutline,
  PhonePortraitOutline,
  SettingsOutline,
  SunnyOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import type { RouteRecordRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { authApi } from '@/api/auth'
import type { RoleCode } from '@/types/api'
import { passwordPolicyText, stripSpaces, validatePasswordInput } from '@/utils/accountPolicy'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const message = useMessage()
const collapsed = ref(false)
const expandedKeys = ref<string[]>([])
const nowText = ref(new Date().toLocaleString('zh-CN', { hour12: false }))
const passwordModalVisible = ref(false)
const passwordSaving = ref(false)
const passwordFormRef = ref<FormInst | null>(null)
const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const timer = window.setInterval(() => {
  nowText.value = new Date().toLocaleString('zh-CN', { hour12: false })
}, 1000)

const changePasswordRules: FormRules = {
  current_password: [{ required: true, message: '请输入当前密码', trigger: ['blur', 'input'] }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: ['blur', 'input'] },
    {
      validator: () => {
        const error = validatePasswordInput(passwordForm.new_password)
        return error ? new Error(error) : true
      },
      trigger: ['blur', 'input'],
    },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: ['blur', 'input'] },
    {
      validator: () => (passwordForm.confirm_password === passwordForm.new_password ? true : new Error('两次输入的新密码不一致')),
      trigger: ['blur', 'input'],
    },
  ],
}

const displayName = computed(() => authStore.username || '管理员')
const currentTitle = computed(() => String(route.meta.title || '系统控制台'))
const themeIcon = computed(() => (themeStore.isDark ? MoonOutline : SunnyOutline))
const breadcrumbs = computed(() => {
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  const subGroup = typeof route.meta.subGroup === 'string' ? route.meta.subGroup : ''
  if (group && subGroup) return [group, subGroup, currentTitle.value]
  return group ? [group, currentTitle.value] : [currentTitle.value]
})

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as never) })
}

function roleLabel(role: RoleCode | '') {
  const labels: Record<string, string> = {
    superadmin: '技术超级管理员',
    admin: '普通管理员',
    enterprise_admin: '企业管理员',
    normal_user: '普通用户',
    temporary_user: '临时用户',
  }
  return labels[role] || '未识别角色'
}

const routeIcons: Record<string, unknown> = {
  dashboard: GridOutline,
  companies: BusinessOutline,
  users: PeopleOutline,
  'registration-applications': DocumentTextOutline,
  'content-site-home': DocumentTextOutline,
  'content-mobile-support': PhonePortraitOutline,
  licenses: KeyOutline,
  devices: DesktopOutline,
  'device-risks': AlertCircleOutline,
  'device-authorization-requests': TimeOutline,
  'device-change-requests': TimeOutline,
  projects: FolderOpenOutline,
  'mobile-global-config': SettingsOutline,
  'mobile-feature-settings': OptionsOutline,
  'mobile-collab-settings': OptionsOutline,
  'mobile-collab-sdk': KeyOutline,
  'mobile-logs': FileTrayFullOutline,
  'win-sky': DocumentTextOutline,
  'win-huaning': DocumentTextOutline,
  'win-global-config': SettingsOutline,
  'win-logs': FileTrayFullOutline,
  'win-other': ListOutline,
  'sync-files': CloudUploadOutline,
  audit: ListOutline,
  about: InformationCircleOutline,
  settings: SettingsOutline,
  'mail-settings': MailOutline,
  'system-logs': FileTrayFullOutline,
  risks: AlertCircleOutline,
  'server-time': TimeOutline,
}

const groupIcons: Record<string, unknown> = {
  授权与设备: KeyOutline,
  移动端项目与数据: PhonePortraitOutline,
  Win端项目与数据: DesktopOutline,
  内容管理: DocumentTextOutline,
  系统设置: SettingsOutline,
}

function groupKey(group: string) {
  return `group:${group}`
}

function subGroupKey(group: string, subGroup: string) {
  return `subgroup:${group}:${subGroup}`
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

function canActivateMenuRoute(record: RouteRecordRaw) {
  return canShowRoute(record) && record.meta?.disabled !== true
}

const activeMenuKey = computed(() => {
  if (route.meta.disabled === true) return ''
  if (!route.meta.hideInMenu) return String(route.name || 'dashboard')
  const fallback = adminChildren.value.find((record) => record.meta?.group === route.meta.group && canActivateMenuRoute(record))
  return String(fallback?.name || 'dashboard')
})

const activeExpandedKeys = computed(() => {
  if (route.meta.disabled === true) return []
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  const subGroup = typeof route.meta.subGroup === 'string' ? route.meta.subGroup : ''
  const keys: string[] = []
  if (group) keys.push(groupKey(group))
  if (group && subGroup) keys.push(subGroupKey(group, subGroup))
  return keys
})

const visibleMenuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = []
  const groups = new Map<string, MenuOption & { children: MenuOption[] }>()
  const subGroups = new Map<string, MenuOption & { children: MenuOption[] }>()

  for (const record of adminChildren.value) {
    if (!canShowRoute(record)) continue

    const key = String(record.name)
    const item: MenuOption = {
      label: String(record.meta?.title || key),
      key,
      icon: renderIcon(routeIcons[key] || DocumentTextOutline),
      disabled: record.meta?.disabled === true,
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

    const subGroup = typeof record.meta?.subGroup === 'string' ? record.meta.subGroup : ''
    if (!subGroup) {
      groups.get(group)?.children.push(item)
      continue
    }

    const nestedKey = subGroupKey(group, subGroup)
    if (!subGroups.has(nestedKey)) {
      const subGroupOption: MenuOption & { children: MenuOption[] } = {
        label: subGroup,
        key: nestedKey,
        icon: renderIcon(FolderOpenOutline),
        children: [],
      }
      subGroups.set(nestedKey, subGroupOption)
      groups.get(group)?.children.push(subGroupOption)
    }

    subGroups.get(nestedKey)?.children.push(item)
  }

  return options
})

const dropdownOptions = [
  {
    label: '修改密码',
    key: 'change-password',
    icon: renderIcon(KeyOutline),
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
]

const themeOptions: MenuOption[] = [
  {
    label: '跟随系统',
    key: 'system',
    icon: renderIcon(DesktopOutline),
  },
  {
    label: '明亮',
    key: 'light',
    icon: renderIcon(SunnyOutline),
  },
  {
    label: '暗色',
    key: 'dark',
    icon: renderIcon(MoonOutline),
  },
]

function onNavigate(key: string) {
  if (key.startsWith('group:') || key.startsWith('subgroup:')) return
  const target = adminChildren.value.find((record) => String(record.name) === key)
  if (target?.meta?.disabled === true) return
  router.push({ name: key })
}

async function handleUserAction(key: string) {
  if (key === 'change-password') {
    openPasswordModal()
    return
  }
  if (key !== 'logout') return
  await authStore.logout()
  router.push({ name: 'login' })
}

function handleThemeSelect(key: string) {
  themeStore.setMode(key as ThemeMode)
}

function resetPasswordForm() {
  passwordForm.current_password = ''
  passwordForm.new_password = ''
  passwordForm.confirm_password = ''
}

function openPasswordModal() {
  resetPasswordForm()
  passwordModalVisible.value = true
}

function handleNewPasswordUpdate(value: string) {
  passwordForm.new_password = stripSpaces(value)
}

function handleConfirmPasswordUpdate(value: string) {
  passwordForm.confirm_password = stripSpaces(value)
}

async function submitPasswordChange() {
  await passwordFormRef.value?.validate()
  passwordSaving.value = true
  try {
    await authApi.changePassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    })
    authStore.mustChangePassword = false
    message.success('密码已修改')
    passwordModalVisible.value = false
    resetPasswordForm()
  } finally {
    passwordSaving.value = false
  }
}

onBeforeUnmount(() => {
  window.clearInterval(timer)
})

watch(
  activeExpandedKeys,
  (keys) => {
    const missingKeys = keys.filter((key) => !expandedKeys.value.includes(key))
    if (missingKeys.length) {
      expandedKeys.value = [...expandedKeys.value, ...missingKeys]
    }
  },
  { immediate: true },
)

watch(
  () => authStore.mustChangePassword,
  (mustChange) => {
    if (mustChange) {
      openPasswordModal()
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
  background: var(--yy-primary);
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
  background: var(--yy-surface);
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
  background: var(--yy-green);
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
