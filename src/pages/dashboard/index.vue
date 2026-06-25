<template>
  <div class="page-shell">
    <PageHeader title="系统控制台" subtitle="Phase 2A 仅提供后台工作入口，业务统计待 P4 后端接口就绪后接入。" />

    <div class="page-grid-4">
      <StatCard label="当前账号" :value="authStore.username || '-'" />
      <StatCard label="角色" :value="roleText" accent="#2f855a" />
      <StatCard label="企业范围" :value="companyText" accent="#b7791f" />
      <StatCard label="风险阻断" :value="authStore.policy.risk_block_enabled ? '已启用' : '未启用'" accent="#c53030" />
    </div>

    <div class="page-card">
      <n-grid :cols="2" :x-gap="14" :y-gap="14" responsive="screen">
        <n-grid-item v-for="entry in visibleEntries" :key="entry.name">
          <button class="entry" type="button" @click="router.push({ name: entry.name })">
            <n-icon :component="entry.icon" size="24" />
            <span>
              <strong>{{ entry.title }}</strong>
              <small>{{ entry.desc }}</small>
            </span>
          </button>
        </n-grid-item>
      </n-grid>
    </div>

    <div class="page-card">
      <n-descriptions title="会话与策略" bordered :column="2">
        <n-descriptions-item label="用户 ID">{{ authStore.userId }}</n-descriptions-item>
        <n-descriptions-item label="企业 ID">{{ authStore.companyId ?? '平台级' }}</n-descriptions-item>
        <n-descriptions-item label="最低 Mobile 版本">{{ authStore.policy.min_mobile_version || '-' }}</n-descriptions-item>
        <n-descriptions-item label="最低 Win 版本">{{ authStore.policy.min_win_version || '-' }}</n-descriptions-item>
        <n-descriptions-item label="普通用户配置编辑">
          {{ authStore.policy.allow_normal_user_config_edit ? '允许' : '不允许' }}
        </n-descriptions-item>
      </n-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BusinessOutline, DesktopOutline, KeyOutline, PeopleOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const roleText = computed(() => (authStore.isSystemAdmin ? '系统管理员' : '企业管理员'))
const companyText = computed(() => authStore.companyName || '全平台')

const entries = [
  { name: 'companies', title: '企业管理', desc: '企业资料、有效期和策略', icon: BusinessOutline, roles: ['system_admin', 'enterprise_admin'] },
  { name: 'users', title: '用户管理', desc: '账号、角色、状态和密码', icon: PeopleOutline, roles: ['system_admin', 'enterprise_admin'] },
  { name: 'licenses', title: '授权管理', desc: '后台发放与撤销授权', icon: KeyOutline, roles: ['system_admin'] },
  { name: 'devices', title: '设备管理', desc: 'Mobile/Win、换机和阻断', icon: DesktopOutline, roles: ['system_admin', 'enterprise_admin'] },
]

const visibleEntries = computed(() => entries.filter((entry) => entry.roles.includes(authStore.roleCode)))
</script>

<style scoped>
.entry {
  display: flex;
  width: 100%;
  min-height: 86px;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--yy-text);
  cursor: pointer;
  text-align: left;
}

.entry:hover {
  border-color: var(--yy-primary);
  background: #f8fafc;
}

.entry span {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.entry small {
  color: var(--yy-text-muted);
}
</style>
