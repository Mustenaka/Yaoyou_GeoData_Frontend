<template>
  <div class="page-shell">
    <PageHeader title="系统信息" subtitle="垚无优土工数据管理系统 / Yaowuyou">
      <n-button :loading="loading" @click="loadHealth">
        <template #icon>
          <n-icon :component="RefreshOutline" />
        </template>
        刷新
      </n-button>
    </PageHeader>

    <div class="about-grid">
      <section class="page-card about-card">
        <div class="about-brand">
          <div class="about-brand__logo">YY</div>
          <div>
            <h2>垚无优土工数据管理系统</h2>
            <p>Yaowuyou GeoData Management System</p>
          </div>
        </div>
        <n-descriptions :column="1" label-placement="left" bordered>
          <n-descriptions-item label="前端版本">{{ appVersion }}</n-descriptions-item>
          <n-descriptions-item label="构建时间">{{ formatDateTime(buildTime) }}</n-descriptions-item>
          <n-descriptions-item label="运行路径">/admin/</n-descriptions-item>
          <n-descriptions-item label="API 基址">相对路径 /api</n-descriptions-item>
        </n-descriptions>
      </section>

      <section class="page-card about-card">
        <div class="section-head">
          <div>
            <strong>后端健康状态</strong>
            <span>来自已有 /api/health</span>
          </div>
          <n-tag :type="health?.status === 'ok' ? 'success' : 'warning'" round>
            {{ health?.status || 'unknown' }}
          </n-tag>
        </div>
        <n-alert v-if="errorText" type="warning" :bordered="false">
          {{ errorText }}
        </n-alert>
        <n-descriptions v-else :column="1" label-placement="left" bordered>
          <n-descriptions-item label="状态">{{ health?.status || '-' }}</n-descriptions-item>
          <n-descriptions-item label="检查时间">{{ checkedAt ? formatDateTime(checkedAt) : '-' }}</n-descriptions-item>
        </n-descriptions>
      </section>

      <section class="page-card about-card about-card--wide">
        <div class="section-head">
          <div>
            <strong>版权与联系</strong>
            <span>测试服信息页，不包含密钥或账号凭据</span>
          </div>
        </div>
        <n-descriptions :column="2" label-placement="left" bordered>
          <n-descriptions-item label="系统名称">垚无优土工数据管理系统</n-descriptions-item>
          <n-descriptions-item label="英文标识">Yaowuyou</n-descriptions-item>
          <n-descriptions-item label="版权">© 2026 Yaowuyou</n-descriptions-item>
          <n-descriptions-item label="联系方式">请联系项目管理员</n-descriptions-item>
        </n-descriptions>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RefreshOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import { systemApi } from '@/api/system'
import type { HealthStatus } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const appVersion = __APP_VERSION__
const buildTime = __BUILD_TIME__
const loading = ref(false)
const errorText = ref('')
const checkedAt = ref('')
const health = ref<HealthStatus | null>(null)

async function loadHealth() {
  loading.value = true
  errorText.value = ''
  try {
    health.value = await systemApi.health()
    checkedAt.value = new Date().toISOString()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '健康检查失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadHealth)
</script>

<style scoped>
.about-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.about-card {
  min-width: 0;
}

.about-card--wide {
  grid-column: 1 / -1;
}

.about-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.about-brand__logo {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 8px;
  background: var(--yy-primary);
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.about-brand h2 {
  margin: 0;
  color: var(--yy-text);
  font-size: 20px;
}

.about-brand p {
  margin: 5px 0 0;
  color: var(--yy-text-muted);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.section-head span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
