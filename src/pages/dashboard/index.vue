<template>
  <div class="page-shell">
    <PageHeader title="系统控制台" subtitle="实时监控服务资源、连接状态与系统风险" />

    <div class="page-grid-4">
      <StatCard label="CPU 使用率" :value="formatPercent(metric?.cpu_usage)" accent="linear-gradient(90deg, #1677ff, #6aaeff)">
        {{ metric?.cpu_usage && metric.cpu_usage > 85 ? '高负载预警' : '运行稳定' }}
      </StatCard>
      <StatCard label="内存使用率" :value="formatPercent(memoryUsage)" accent="linear-gradient(90deg, #11b4d8, #0dd39e)">
        {{ memoryUsage > 80 ? '内存偏高' : '内存正常' }}
      </StatCard>
      <StatCard label="磁盘使用率" :value="formatPercent(metric?.disk_usage)" accent="linear-gradient(90deg, #4568ff, #7a8cff)">
        {{ metric?.disk_usage && metric.disk_usage > 80 ? '建议清理' : '空间充足' }}
      </StatCard>
      <StatCard label="活跃 WS 连接" :value="metric?.active_ws ?? 0" unit="conn" accent="linear-gradient(90deg, #00a76f, #37d67a)">
        Goroutines: {{ metric?.goroutines ?? 0 }}
      </StatCard>
    </div>

    <div class="page-grid-2">
      <div class="glass-panel chart-panel">
        <div class="chart-panel__title">CPU / 内存趋势</div>
        <VChart class="chart" :option="lineOption" autoresize />
      </div>
      <div class="glass-panel chart-panel">
        <div class="chart-panel__title">当前关键指标</div>
        <VChart class="chart" :option="barOption" autoresize />
      </div>
    </div>

    <div class="page-grid-2">
      <div class="glass-panel block-panel">
        <div class="block-panel__title">实时连接状态</div>
        <n-space vertical :size="12">
          <n-tag :type="connected ? 'success' : 'warning'" round>
            {{ connected ? 'SSE 已连接' : 'SSE 重连中' }}
          </n-tag>
          <div class="detail-row">
            <span>最近采样时间</span>
            <strong>{{ lastSampleText }}</strong>
          </div>
          <div class="detail-row">
            <span>图表样本数</span>
            <strong>{{ history.length }}</strong>
          </div>
        </n-space>
      </div>

      <div class="glass-panel block-panel">
        <div class="block-panel__title">风险提示</div>
        <n-alert v-for="alert in alerts" :key="alert.title" :title="alert.title" :type="alert.type" style="margin-bottom: 10px">
          {{ alert.message }}
        </n-alert>
        <n-empty v-if="alerts.length === 0" description="当前没有告警" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { useMetricsSSE } from '@/composables/useMetricsSSE'
import { formatDateTime, formatPercent } from '@/utils/format'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const { connected, current: metric, history } = useMetricsSSE()

const memoryUsage = computed(() => metric.value?.memory_usage ?? metric.value?.mem_usage ?? 0)
const lastSampleText = computed(() => formatDateTime(metric.value?.timestamp))

const alerts = computed(() => {
  const items: Array<{ title: string; message: string; type: 'warning' | 'error' }> = []

  if ((metric.value?.cpu_usage ?? 0) > 85) {
    items.push({
      title: 'CPU 超载',
      message: `CPU 使用率已达到 ${metric.value?.cpu_usage.toFixed(1)}%，建议检查任务峰值或消息广播压力。`,
      type: 'warning',
    })
  }

  if (memoryUsage.value > 80) {
    items.push({
      title: '内存偏高',
      message: `内存使用率 ${memoryUsage.value.toFixed(1)}%，建议关注 goroutine 和缓存占用。`,
      type: 'warning',
    })
  }

  if ((metric.value?.disk_usage ?? 0) > 80) {
    items.push({
      title: '磁盘预警',
      message: `磁盘使用率 ${metric.value?.disk_usage.toFixed(1)}%，应尽快清理日志和备份目录。`,
      type: 'error',
    })
  }

  return items
})

const lineOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['CPU', '内存'],
    textStyle: { color: '#4c6489' },
  },
  grid: { left: 48, right: 20, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: history.value.map((item) => new Date(item.timestamp).toLocaleTimeString('zh-CN')),
    axisLabel: { color: '#7992b8' },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { color: '#7992b8', formatter: '{value}%' },
  },
  series: [
    {
      name: 'CPU',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: history.value.map((item) => item.cpu_usage),
      lineStyle: { color: '#1677ff', width: 2 },
      areaStyle: { color: 'rgba(22,119,255,0.14)' },
    },
    {
      name: '内存',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: history.value.map((item) => item.memory_usage ?? item.mem_usage ?? 0),
      lineStyle: { color: '#11b4d8', width: 2 },
      areaStyle: { color: 'rgba(17,180,216,0.12)' },
    },
  ],
}))

const barOption = computed(() => ({
  tooltip: {},
  grid: { left: 32, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: ['CPU', '内存', '磁盘', 'WS'],
    axisLabel: { color: '#7992b8' },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#7992b8' },
  },
  series: [
    {
      type: 'bar',
      barWidth: 28,
      data: [
        metric.value?.cpu_usage ?? 0,
        memoryUsage.value,
        metric.value?.disk_usage ?? 0,
        metric.value?.active_ws ?? 0,
      ],
      itemStyle: {
        color: ({ dataIndex }: { dataIndex: number }) =>
          ['#1677ff', '#11b4d8', '#4568ff', '#00a76f'][dataIndex],
        borderRadius: [8, 8, 0, 0],
      },
    },
  ],
}))
</script>

<style scoped>
.chart-panel,
.block-panel {
  padding: 18px;
}

.chart-panel__title,
.block-panel__title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 700;
}

.chart {
  height: 280px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--sky-text-secondary);
}
</style>
