<template>
  <main class="apply-page">
    <section class="apply-panel">
      <div class="apply-header">
        <div class="apply-logo">YY</div>
        <div>
          <h1>开通申请</h1>
          <p>Yaowuyou</p>
        </div>
      </div>

      <n-result v-if="receipt" status="success" title="申请已提交" :description="`回执编号：${receipt.id}`">
        <template #footer>
          <n-space justify="center">
            <n-button @click="resetForm">继续提交</n-button>
            <n-button type="primary" @click="router.push({ name: 'login' })">返回登录</n-button>
          </n-space>
        </template>
      </n-result>

      <n-form v-else ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="申请类型" path="app_type">
          <n-radio-group v-model:value="form.app_type">
            <n-radio-button value="enterprise">单位注册申请</n-radio-button>
            <n-radio-button value="user">个人注册申请</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="账户名" path="desired_username">
          <n-input v-model:value="form.desired_username" maxlength="64" placeholder="用于登录的账户名，不可包含空格" />
        </n-form-item>

        <n-form-item v-if="form.app_type === 'enterprise'" label="单位名称" path="company_name">
          <n-input v-model:value="form.company_name" maxlength="128" />
        </n-form-item>
        <template v-else>
          <n-form-item label="企业归属">
            <n-radio-group v-model:value="userCompanyMode">
              <n-radio-button value="company">已有企业</n-radio-button>
              <n-radio-button value="none">无企业</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item v-if="userCompanyMode === 'company'" label="目标企业 ID" path="target_company_id">
            <n-input-number v-model:value="form.target_company_id" :min="1" style="width: 100%" />
          </n-form-item>
        </template>

        <n-grid :cols="2" :x-gap="12">
          <n-grid-item>
            <n-form-item label="姓名/实名" path="contact_name">
              <n-input v-model:value="form.contact_name" maxlength="64" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="手机" path="phone">
              <n-input v-model:value="form.phone" maxlength="32" />
            </n-form-item>
          </n-grid-item>
        </n-grid>

        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" maxlength="128" />
        </n-form-item>

        <n-form-item label="产品" path="requested_product">
          <n-radio-group v-model:value="form.requested_product">
            <n-radio-button value="both">Mobile + Win</n-radio-button>
            <n-radio-button value="mobile">Mobile</n-radio-button>
            <n-radio-button value="win">Win</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="申请说明" path="reason">
          <n-input v-model:value="form.reason" type="textarea" maxlength="1000" show-count />
        </n-form-item>

        <n-space justify="space-between" align="center">
          <n-button text @click="router.push({ name: 'login' })">返回登录</n-button>
          <n-button type="primary" :loading="submitting" @click="submit">提交申请</n-button>
        </n-space>
      </n-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { registrationApi } from '@/api/registration'
import type { RegistrationApplicationPayload, RegistrationReceipt } from '@/types/api'

const router = useRouter()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const receipt = ref<RegistrationReceipt | null>(null)
const userCompanyMode = ref<'company' | 'none'>('company')

const form = reactive<RegistrationApplicationPayload>({
  app_type: 'enterprise',
  desired_username: '',
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  target_company_id: null,
  no_company: false,
  requested_product: 'both',
  reason: '',
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9+\-() ]{6,32}$/
const whitespacePattern = /\s/

const rules: FormRules = {
  app_type: [{ required: true, message: '请选择申请类型', trigger: ['blur', 'change'] }],
  desired_username: [
    { required: true, message: '请输入账户名', trigger: ['blur', 'input'] },
    {
      validator: () => {
        const value = form.desired_username?.trim() || ''
        return value && !whitespacePattern.test(value) ? true : new Error('账户名不可为空或包含空格')
      },
      trigger: ['blur', 'input'],
    },
  ],
  company_name: [
    {
      validator: () => (form.app_type !== 'enterprise' || form.company_name ? true : new Error('请输入单位名称')),
      trigger: ['blur', 'input'],
    },
  ],
  target_company_id: [
    {
      validator: () => (form.app_type !== 'user' || userCompanyMode.value === 'none' || form.target_company_id ? true : new Error('请输入目标企业 ID')),
      trigger: ['blur', 'change'],
    },
  ],
  contact_name: [{ required: true, message: '请输入姓名/实名', trigger: ['blur', 'input'] }],
  phone: [
    { required: true, message: '请输入手机', trigger: ['blur', 'input'] },
    { validator: () => (phonePattern.test(form.phone || '') ? true : new Error('手机格式不正确')), trigger: ['blur', 'input'] },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'input'] },
    { validator: () => (emailPattern.test(form.email || '') ? true : new Error('邮箱格式不正确')), trigger: ['blur', 'input'] },
  ],
  requested_product: [{ required: true, message: '请选择产品', trigger: ['blur', 'change'] }],
}

function resetForm() {
  Object.assign(form, {
    app_type: 'enterprise',
    desired_username: '',
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    target_company_id: null,
    no_company: false,
    requested_product: 'both',
    reason: '',
  })
  userCompanyMode.value = 'company'
  receipt.value = null
}

async function submit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload: RegistrationApplicationPayload = {
      app_type: form.app_type,
      source_channel: 'admin_apply_page',
      desired_username: form.desired_username.trim(),
      company_name: form.app_type === 'enterprise' ? form.company_name : '',
      contact_name: form.contact_name,
      phone: form.phone,
      email: form.email,
      target_company_id: form.app_type === 'user' && userCompanyMode.value === 'company' ? form.target_company_id : null,
      no_company: form.app_type === 'user' && userCompanyMode.value === 'none',
      requested_product: form.requested_product,
      requested_role: form.app_type === 'enterprise' ? 'enterprise_admin' : 'normal_user',
      reason: form.reason,
    }
    receipt.value = await registrationApi.submit(payload)
    message.success('申请已提交')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.apply-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 20px;
  background: var(--yy-bg);
}

.apply-panel {
  width: min(560px, 100%);
  padding: 28px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 12px 30px var(--yy-shadow);
}

.apply-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.apply-logo {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--yy-primary);
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.apply-header h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}

.apply-header p {
  margin: 5px 0 0;
  color: var(--yy-text-secondary);
  font-size: 13px;
}
</style>
