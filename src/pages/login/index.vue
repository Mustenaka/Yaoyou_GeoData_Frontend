<template>
  <div class="login-page">
    <section class="login-panel">
      <div class="login-header">
        <div class="login-logo">YY</div>
        <div>
          <h1>垚无忧土工数据管理系统</h1>
          <p>Yaowuyou</p>
        </div>
      </div>

      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="账号" path="username">
          <n-input v-model:value="form.username" clearable placeholder="请输入后台账号" />
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
          登录
        </n-button>
        <div class="login-actions">
          <router-link to="/apply">申请开通</router-link>
        </div>
      </n-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: ['blur', 'input'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }],
}

async function handleLogin() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const session = await authApi.login({
      username: form.username,
      password: form.password,
      client_type: 'admin',
      app_version: import.meta.env.VITE_APP_VERSION || 'web-admin',
    })
    authStore.setSession(session)
    if (!authStore.canEnterAdmin) {
      authStore.clearSession()
      message.error('当前账号不能进入后台管理端')
      return
    }
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
  min-height: 100vh;
  place-items: center;
  padding: 20px;
  background: var(--yy-bg);
}

.login-panel {
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 12px 30px var(--yy-shadow);
}

.login-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.login-logo {
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

.login-header h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}

.login-header p {
  margin: 5px 0 0;
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.login-actions {
  margin-top: 14px;
  text-align: center;
  font-size: 14px;
}

.login-actions a {
  color: var(--yy-primary);
  text-decoration: none;
}
</style>
