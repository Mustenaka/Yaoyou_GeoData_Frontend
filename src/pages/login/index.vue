<template>
  <div class="login-page">
    <div class="login-panel glass-panel">
      <div class="login-panel__header">
        <div class="login-panel__logo">SKY</div>
        <div>
          <div class="login-panel__title">岩土智能云控平台</div>
          <div class="login-panel__subtitle">后台管理系统</div>
        </div>
      </div>

      <n-alert title="默认管理员账号" type="info" style="margin-bottom: 18px">
        用户名：admin，密码：Admin@123456
      </n-alert>

      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入管理员账号" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </n-form-item>
        <n-button type="primary" block size="large" :loading="submitting" @click="handleLogin">
          登录管理端
        </n-button>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const form = reactive({
  username: 'admin',
  password: 'Admin@123456',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: ['blur', 'input'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }],
}

async function handleLogin() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const response = await authApi.login(form.username, form.password)
    authStore.setSession(response)
    message.success('登录成功')
    router.push(String(route.query.redirect || '/dashboard'))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-panel {
  width: min(420px, 100%);
  padding: 28px;
}

.login-panel__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.login-panel__logo {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--sky-blue), var(--sky-cyan));
  color: white;
  font-family: var(--font-display);
  font-size: 22px;
}

.login-panel__title {
  font-size: 22px;
  font-weight: 700;
}

.login-panel__subtitle {
  margin-top: 6px;
  color: var(--sky-text-secondary);
  letter-spacing: 0.08em;
}
</style>
