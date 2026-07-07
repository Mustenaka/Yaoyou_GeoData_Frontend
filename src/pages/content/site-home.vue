<template>
  <div class="page-shell site-home-page">
    <PageHeader title="官网首页文案" subtitle="维护官网首页头图区与应用介绍卡片的文案和图片。">
      <n-space>
        <n-button :loading="loading" @click="loadHomeContent">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        <n-button secondary @click="restoreDefaults">
          恢复默认文案
        </n-button>
        <n-button type="primary" :loading="saving" @click="saveHomeContent">
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

    <n-spin :show="loading">
      <div class="home-editor-grid">
        <section class="glass-panel editor-section">
          <div class="section-head">
            <div>
              <h2>第一部分（首页头图区）</h2>
              <p>展示在官网首屏，用于说明产品定位与多端形态。</p>
            </div>
            <n-tag v-if="lastUpdated" round>更新于 {{ lastUpdated }}</n-tag>
          </div>

          <n-form label-placement="top">
            <n-grid :cols="3" :x-gap="12" :y-gap="4" responsive="screen">
              <n-grid-item>
                <n-form-item label="眉标（≤64 字符）">
                  <n-input v-model:value="form.section1.eyebrow" clearable :maxlength="64" show-count />
                </n-form-item>
              </n-grid-item>
              <n-grid-item span="2">
                <n-form-item label="标题（≤128 字符）">
                  <n-input v-model:value="form.section1.title" clearable :maxlength="128" show-count />
                </n-form-item>
              </n-grid-item>
              <n-grid-item span="3">
                <n-form-item label="导语（≤2000 字符）">
                  <n-input
                    v-model:value="form.section1.lead"
                    type="textarea"
                    :maxlength="2000"
                    show-count
                    :autosize="{ minRows: 4, maxRows: 8 }"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>

          <div class="image-grid">
            <ImageField
              label="桌面端图片"
              :value="form.section1.images.win"
              :preview="previewSrc('section1.win')"
              :original="originalSrc('section1.win')"
              :loading="uploadingTarget === 'section1.win'"
              @update:value="form.section1.images.win = $event"
              @upload="triggerUpload('section1.win')"
            />
            <ImageField
              label="平板图片"
              :value="form.section1.images.pad"
              :preview="previewSrc('section1.pad')"
              :original="originalSrc('section1.pad')"
              :loading="uploadingTarget === 'section1.pad'"
              @update:value="form.section1.images.pad = $event"
              @upload="triggerUpload('section1.pad')"
            />
            <ImageField
              label="手机图片"
              :value="form.section1.images.phone"
              :preview="previewSrc('section1.phone')"
              :original="originalSrc('section1.phone')"
              :loading="uploadingTarget === 'section1.phone'"
              @update:value="form.section1.images.phone = $event"
              @upload="triggerUpload('section1.phone')"
            />
          </div>
        </section>

        <section class="glass-panel editor-section">
          <div class="section-head">
            <div>
              <h2>第二部分（应用介绍卡片）</h2>
              <p>固定两张卡片，分别展示移动端录入和桌面端处理场景。</p>
            </div>
          </div>

          <n-form label-placement="top">
            <n-grid :cols="3" :x-gap="12" :y-gap="4" responsive="screen">
              <n-grid-item>
                <n-form-item label="眉标（≤64 字符）">
                  <n-input v-model:value="form.section2.eyebrow" clearable :maxlength="64" show-count />
                </n-form-item>
              </n-grid-item>
              <n-grid-item span="2">
                <n-form-item label="标题（≤128 字符）">
                  <n-input v-model:value="form.section2.title" clearable :maxlength="128" show-count />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>

          <div class="card-editors">
            <article v-for="(card, index) in form.section2.cards" :key="index" class="card-editor">
              <div class="card-head">
                <strong>应用卡片 {{ index + 1 }}</strong>
                <n-tag round size="small">{{ index === 0 ? '移动端' : '桌面端' }}</n-tag>
              </div>

              <n-form label-placement="top">
                <n-grid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
                  <n-grid-item>
                    <n-form-item label="短标签（≤64 字符）">
                      <n-input v-model:value="card.kicker" clearable :maxlength="64" show-count />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="标题（≤128 字符）">
                      <n-input v-model:value="card.title" clearable :maxlength="128" show-count />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item span="2">
                    <n-form-item label="正文（≤2000 字符）">
                      <n-input
                        v-model:value="card.text"
                        type="textarea"
                        :maxlength="2000"
                        show-count
                        :autosize="{ minRows: 4, maxRows: 8 }"
                      />
                    </n-form-item>
                  </n-grid-item>
                </n-grid>
              </n-form>

              <ImageField
                :label="`卡片 ${index + 1} 图片`"
                :value="card.image"
                :preview="previewSrc(index === 0 ? 'section2.card0' : 'section2.card1')"
                :original="originalSrc(index === 0 ? 'section2.card0' : 'section2.card1')"
                :loading="uploadingTarget === (index === 0 ? 'section2.card0' : 'section2.card1')"
                @update:value="card.image = $event"
                @upload="triggerUpload(index === 0 ? 'section2.card0' : 'section2.card1')"
              />
            </article>
          </div>
        </section>
      </div>
    </n-spin>

    <input ref="fileInputRef" class="hidden-file-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" @change="handleFileChange" />
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref } from 'vue'
import { NButton, NFormItem, NIcon, NImage, NInput, useMessage } from 'naive-ui'
import { CloudUploadOutline, RefreshOutline, SaveOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import {
  DEFAULT_SITE_HOME_CONTENT,
  siteContentApi,
  type SiteHomeCard,
  type SiteHomeContent,
  type SiteHomeContentPayload,
  type SiteHomeImages,
  type SiteHomeSection1,
  type SiteHomeSection2,
} from '@/api/site-content'

type ImageTarget = 'section1.win' | 'section1.pad' | 'section1.phone' | 'section2.card0' | 'section2.card1'

const ImageField = defineComponent({
  name: 'ImageField',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    preview: { type: String, required: true },
    original: { type: String, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: ['update:value', 'upload'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'image-field' }, [
        h('div', { class: 'image-preview' }, [
          h(NImage, {
            src: props.preview,
            previewSrc: props.original,
            fallbackSrc: props.original,
            alt: props.label,
            objectFit: 'contain',
            lazy: true,
            class: 'image-preview-img',
          }),
        ]),
        h('div', { class: 'image-control' }, [
          h(
            NFormItem,
            { label: `${props.label}路径` },
            {
              default: () =>
                h(NInput, {
                  value: props.value,
                  clearable: true,
                  placeholder: '/api/site/assets/example.webp',
                  onUpdateValue: (value: string) => emit('update:value', value),
                }),
            },
          ),
          h(
            NButton,
            { secondary: true, loading: props.loading, onClick: () => emit('upload') },
            {
              icon: () => h(NIcon, { component: CloudUploadOutline }),
              default: () => '上传图片',
            },
          ),
        ]),
      ])
  },
})

const allowedImagePrefixes = ['/assets/', '/api/site/assets/']
const allowedAssetTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const allowedAssetExts = new Set(['png', 'jpg', 'jpeg', 'webp'])
const maxAssetSize = 5 * 1024 * 1024
const siteAssetOriginalRe = /^\/api\/site\/assets\/([a-f0-9]{32})\.(?:png|jpg|jpeg|webp)$/

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const lastUpdated = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingUploadTarget = ref<ImageTarget | null>(null)
const uploadingTarget = ref<ImageTarget | null>(null)

const form = reactive<SiteHomeContentPayload>(clonePayload(DEFAULT_SITE_HOME_CONTENT))

function clonePayload(content: SiteHomeContent | SiteHomeContentPayload): SiteHomeContentPayload {
  return JSON.parse(JSON.stringify({ section1: content.section1, section2: content.section2 })) as SiteHomeContentPayload
}

function assignPayload(payload: SiteHomeContentPayload) {
  form.section1 = payload.section1
  form.section2 = payload.section2
}

function normalizePayload(content?: Partial<SiteHomeContent>): SiteHomeContentPayload {
  const defaults = DEFAULT_SITE_HOME_CONTENT
  const section1 = content?.section1 ?? ({} as Partial<SiteHomeSection1>)
  const images = section1.images ?? ({} as Partial<SiteHomeImages>)
  const section2 = content?.section2 ?? ({} as Partial<SiteHomeSection2>)
  const cards = Array.isArray(section2.cards) ? section2.cards : []

  return {
    section1: {
      eyebrow: textOrFallback(section1.eyebrow, defaults.section1.eyebrow),
      title: textOrFallback(section1.title, defaults.section1.title),
      lead: textOrFallback(section1.lead, defaults.section1.lead),
      images: {
        win: textOrFallback(images.win, defaults.section1.images.win),
        pad: textOrFallback(images.pad, defaults.section1.images.pad),
        phone: textOrFallback(images.phone, defaults.section1.images.phone),
      },
    },
    section2: {
      eyebrow: textOrFallback(section2.eyebrow, defaults.section2.eyebrow),
      title: textOrFallback(section2.title, defaults.section2.title),
      cards: defaults.section2.cards.map((defaultCard, index) => {
        const card = cards[index] ?? ({} as Partial<SiteHomeCard>)
        return {
          kicker: textOrFallback(card.kicker, defaultCard.kicker),
          title: textOrFallback(card.title, defaultCard.title),
          text: textOrFallback(card.text, defaultCard.text),
          image: textOrFallback(card.image, defaultCard.image),
        }
      }),
    },
  }
}

function textOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function charLength(value: string) {
  return Array.from(value).length
}

function decodePath(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isAllowedImagePath(value: string) {
  const path = value.trim()
  const decodedPath = decodePath(path)
  if (!path || path.includes('..') || decodedPath.includes('..') || path.includes('\\')) return false
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return false
  return allowedImagePrefixes.some((prefix) => path.startsWith(prefix))
}

function fallbackImage(target: ImageTarget) {
  switch (target) {
    case 'section1.win':
      return DEFAULT_SITE_HOME_CONTENT.section1.images.win
    case 'section1.pad':
      return DEFAULT_SITE_HOME_CONTENT.section1.images.pad
    case 'section1.phone':
      return DEFAULT_SITE_HOME_CONTENT.section1.images.phone
    case 'section2.card0':
      return DEFAULT_SITE_HOME_CONTENT.section2.cards[0].image
    case 'section2.card1':
      return DEFAULT_SITE_HOME_CONTENT.section2.cards[1].image
  }
}

function getImageValue(target: ImageTarget) {
  switch (target) {
    case 'section1.win':
      return form.section1.images.win
    case 'section1.pad':
      return form.section1.images.pad
    case 'section1.phone':
      return form.section1.images.phone
    case 'section2.card0':
      return form.section2.cards[0]?.image || ''
    case 'section2.card1':
      return form.section2.cards[1]?.image || ''
  }
}

function setImageValue(target: ImageTarget, value: string) {
  switch (target) {
    case 'section1.win':
      form.section1.images.win = value
      break
    case 'section1.pad':
      form.section1.images.pad = value
      break
    case 'section1.phone':
      form.section1.images.phone = value
      break
    case 'section2.card0':
      form.section2.cards[0].image = value
      break
    case 'section2.card1':
      form.section2.cards[1].image = value
      break
  }
}

function previewSrc(target: ImageTarget) {
  return thumbnailPreviewSrc(originalSrc(target))
}

function originalSrc(target: ImageTarget) {
  const value = getImageValue(target)
  return isAllowedImagePath(value) ? value.trim() : fallbackImage(target)
}

function thumbnailPreviewSrc(value: string) {
  const match = value.match(siteAssetOriginalRe)
  return match ? `/api/site/assets/${match[1]}_thumb.jpg` : value
}

function requireText(label: string, value: string, max: number) {
  const next = value.trim()
  if (!next) return `${label}不能为空`
  if (charLength(next) > max) return `${label}不能超过 ${max} 字符`
  return ''
}

function validatePayload(payload: SiteHomeContentPayload) {
  const fields: Array<[string, string, number]> = [
    ['第一部分眉标', payload.section1.eyebrow, 64],
    ['第一部分标题', payload.section1.title, 128],
    ['第一部分导语', payload.section1.lead, 2000],
    ['第二部分眉标', payload.section2.eyebrow, 64],
    ['第二部分标题', payload.section2.title, 128],
  ]

  for (const [label, value, max] of fields) {
    const error = requireText(label, value, max)
    if (error) return error
  }

  if (payload.section2.cards.length !== 2) return '第二部分应用卡片必须固定为 2 张'

  for (const [index, card] of payload.section2.cards.entries()) {
    const cardFields: Array<[string, string, number]> = [
      [`应用卡片 ${index + 1} 短标签`, card.kicker, 64],
      [`应用卡片 ${index + 1} 标题`, card.title, 128],
      [`应用卡片 ${index + 1} 正文`, card.text, 2000],
    ]
    for (const [label, value, max] of cardFields) {
      const error = requireText(label, value, max)
      if (error) return error
    }
  }

  const images: Array<[string, string]> = [
    ['桌面端图片', payload.section1.images.win],
    ['平板图片', payload.section1.images.pad],
    ['手机图片', payload.section1.images.phone],
    ['应用卡片 1 图片', payload.section2.cards[0].image],
    ['应用卡片 2 图片', payload.section2.cards[1].image],
  ]
  for (const [label, value] of images) {
    if (!isAllowedImagePath(value)) return `${label}必须使用 /assets/ 或 /api/site/assets/ 开头的站内路径`
  }

  return ''
}

function trimPayload(payload: SiteHomeContentPayload): SiteHomeContentPayload {
  return {
    section1: {
      eyebrow: payload.section1.eyebrow.trim(),
      title: payload.section1.title.trim(),
      lead: payload.section1.lead.trim(),
      images: {
        win: payload.section1.images.win.trim(),
        pad: payload.section1.images.pad.trim(),
        phone: payload.section1.images.phone.trim(),
      },
    },
    section2: {
      eyebrow: payload.section2.eyebrow.trim(),
      title: payload.section2.title.trim(),
      cards: payload.section2.cards.map((card) => ({
        kicker: card.kicker.trim(),
        title: card.title.trim(),
        text: card.text.trim(),
        image: card.image.trim(),
      })),
    },
  }
}

async function loadHomeContent() {
  loading.value = true
  errorText.value = ''
  try {
    const data = await siteContentApi.getHomeContent()
    assignPayload(normalizePayload(data))
    lastUpdated.value = data.updated_at || ''
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '官网首页文案加载失败'
  } finally {
    loading.value = false
  }
}

function restoreDefaults() {
  assignPayload(clonePayload(DEFAULT_SITE_HOME_CONTENT))
  lastUpdated.value = ''
  message.info('默认文案已填入，保存后生效')
}

async function saveHomeContent() {
  const payload = trimPayload(clonePayload(form))
  const error = validatePayload(payload)
  if (error) {
    message.error(error)
    return
  }

  saving.value = true
  errorText.value = ''
  try {
    const data = await siteContentApi.updateHomeContent(payload)
    assignPayload(normalizePayload(data))
    lastUpdated.value = data.updated_at || ''
    message.success('官网首页文案已保存')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '官网首页文案保存失败'
  } finally {
    saving.value = false
  }
}

function triggerUpload(target: ImageTarget) {
  pendingUploadTarget.value = target
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const target = pendingUploadTarget.value
  input.value = ''
  if (!file || !target) return

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowedAssetTypes.has(file.type) && !allowedAssetExts.has(ext)) {
    message.error('仅支持 png、jpg、jpeg、webp 图片')
    return
  }
  if (file.size > maxAssetSize) {
    message.error('图片大小不能超过 5MB')
    return
  }

  uploadingTarget.value = target
  errorText.value = ''
  try {
    const data = await siteContentApi.uploadAsset(file)
    setImageValue(target, data.url)
    message.success('图片上传成功')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '图片上传失败'
  } finally {
    uploadingTarget.value = null
    pendingUploadTarget.value = null
  }
}

onMounted(loadHomeContent)
</script>

<style scoped>
.home-editor-grid {
  display: grid;
  gap: 16px;
}

.editor-section {
  display: grid;
  gap: 18px;
}

.section-head,
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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

.image-grid,
.card-editors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.card-editor {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.68);
}

.image-field {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.image-preview {
  width: 180px;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background:
    linear-gradient(45deg, rgba(148, 163, 184, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(148, 163, 184, 0.08) 25%, transparent 25%),
    #f8fafc;
  background-size: 18px 18px;
  background-position:
    0 0,
    0 9px;
}

.image-preview :deep(.n-image) {
  width: 100%;
  height: 100%;
  display: block;
}

.image-preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.image-control {
  min-width: 0;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 720px) {
  .image-field {
    grid-template-columns: 1fr;
  }

  .image-preview {
    width: 100%;
  }
}
</style>
