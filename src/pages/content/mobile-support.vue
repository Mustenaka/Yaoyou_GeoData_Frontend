<template>
  <div class="page-shell mobile-support-page">
    <PageHeader title="技术支持页文案" subtitle="维护移动端登录页技术支持入口展示的纯文本内容。">
      <n-space>
        <n-button :loading="loading" @click="loadSupportContent">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        <n-button type="primary" :loading="saving" @click="saveSupportContent">
          <template #icon>
            <n-icon :component="SaveOutline" />
          </template>
          保存
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <section class="glass-panel support-panel">
      <n-spin :show="loading">
        <div class="section-head">
          <div>
            <h2>技术支持文本</h2>
            <p>此内容展示在移动端登录页-技术支持页面，用于向用户展示联系方式</p>
          </div>
          <n-tag v-if="lastUpdated" round>更新于 {{ lastUpdated }}</n-tag>
        </div>

        <n-input
          v-model:value="content"
          type="textarea"
          :maxlength="2000"
          show-count
          placeholder="请输入技术支持联系方式或说明"
          :autosize="{ minRows: 12, maxRows: 18 }"
        />
      </n-spin>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { RefreshOutline, SaveOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import { DEFAULT_SITE_SUPPORT_CONTENT, siteContentApi } from '@/api/site-content'

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const content = ref(DEFAULT_SITE_SUPPORT_CONTENT)
const lastUpdated = ref('')

async function loadSupportContent() {
  loading.value = true
  errorText.value = ''
  try {
    const data = await siteContentApi.getSupportContent()
    content.value = data.content || DEFAULT_SITE_SUPPORT_CONTENT
    lastUpdated.value = data.updated_at || ''
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '技术支持页文案加载失败'
  } finally {
    loading.value = false
  }
}

async function saveSupportContent() {
  if (Array.from(content.value).length > 2000) {
    message.error('技术支持页文案不能超过 2000 字符')
    return
  }

  saving.value = true
  errorText.value = ''
  try {
    const data = await siteContentApi.updateSupportContent({ content: content.value })
    content.value = data.content
    lastUpdated.value = data.updated_at || ''
    message.success('技术支持页文案已保存')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '技术支持页文案保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(loadSupportContent)
</script>

<style scoped>
.support-panel {
  display: grid;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-head h2 {
  margin: 0;
  font-size: 17px;
}

.section-head p {
  margin: 6px 0 0;
  color: var(--yy-text-secondary);
  font-size: 13px;
}
</style>
