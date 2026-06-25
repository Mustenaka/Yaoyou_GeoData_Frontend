import request from './request'
import type {
  DashboardRecentEvents,
  DashboardStorage,
  DashboardSummary,
  MaintenanceBackupResponse,
  MaintenanceCleanupResponse,
  SystemSettings,
  SystemSettingsPayload,
} from '@/types/api'

export const opsApi = {
  summary() {
    return request.get<DashboardSummary, DashboardSummary>('/admin/dashboard/summary')
  },
  storage() {
    return request.get<DashboardStorage, DashboardStorage>('/admin/dashboard/storage')
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
