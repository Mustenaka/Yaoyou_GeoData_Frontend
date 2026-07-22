import request, { downloadBlob } from './request'
import type {
  DashboardRecentEvents,
  DashboardServerMetrics,
  DashboardStorage,
  DashboardSummary,
  MaintenanceBackupResponse,
  MaintenanceCleanupResponse,
  SystemSettings,
  SystemSettingsPayload,
} from '@/types/api'

export interface ServerMetricHistoryParams {
  limit?: number
  start_at?: string
  end_at?: string
}

export const opsApi = {
  summary() {
    return request.get<DashboardSummary, DashboardSummary>('/admin/dashboard/summary')
  },
  storage() {
    return request.get<DashboardStorage, DashboardStorage>('/admin/dashboard/storage')
  },
  serverMetrics(params: ServerMetricHistoryParams = { limit: 60 }) {
	return request.get<DashboardServerMetrics, DashboardServerMetrics>('/admin/dashboard/server-metrics', { params })
  },
  exportServerMetrics(params: ServerMetricHistoryParams = {}) {
	return downloadBlob('/admin/dashboard/server-metrics/export', params as Record<string, unknown>)
  },
  recentEvents() {
    return request.get<DashboardRecentEvents, DashboardRecentEvents>('/admin/dashboard/recent-events')
  },
  settings() {
    return request.get<SystemSettings, SystemSettings>('/admin/settings')
  },
  updateSettings(payload: SystemSettingsPayload) {
    return request.put<SystemSettings, SystemSettings>('/admin/settings', payload)
  },
  backup() {
    return request.post<MaintenanceBackupResponse, MaintenanceBackupResponse>('/admin/maintenance/backup')
  },
  cleanup() {
    return request.post<MaintenanceCleanupResponse, MaintenanceCleanupResponse>('/admin/maintenance/cleanup')
  },
}
