<template>
  <div class="page-shell">
    <PageHeader title="系统设置" subtitle="这里先提供部署约定、接口接入说明与后续待补项" />

    <div class="page-grid-2">
      <div class="glass-panel panel">
        <div class="panel__title">当前接入情况</div>
        <n-timeline>
          <n-timeline-item type="success" content="登录、Token 刷新、退出登录已接入" />
          <n-timeline-item type="success" content="用户、设备、系统日志、客户端日志管理已接入" />
          <n-timeline-item type="success" content="系统负载控制台已接入 SSE 实时指标流" />
          <n-timeline-item type="warning" content="协作监控暂用项目/成员聚合方案，待后端补充管理员实时流" />
          <n-timeline-item type="warning" content="管理员创建用户、日志实时流、系统策略持久化接口尚未提供" />
        </n-timeline>
      </div>

      <div class="glass-panel panel">
        <div class="panel__title">部署约定</div>
        <n-descriptions label-placement="left" bordered :column="1">
          <n-descriptions-item label="前端路由基准">/admin/</n-descriptions-item>
          <n-descriptions-item label="API 基准">/api</n-descriptions-item>
          <n-descriptions-item label="WebSocket 代理">/ws/*</n-descriptions-item>
          <n-descriptions-item label="Vite 开发端口">3000</n-descriptions-item>
          <n-descriptions-item label="后端本地地址">127.0.0.1:8080</n-descriptions-item>
        </n-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
</script>

<style scoped>
.panel {
  padding: 18px;
}

.panel__title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 700;
}
</style>
