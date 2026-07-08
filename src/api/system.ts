import request from './request'
import type { HealthStatus, VersionStatus } from '@/types/api'

export const systemApi = {
  health() {
    return request.get<HealthStatus, HealthStatus>('/health')
  },
  version() {
    return request.get<VersionStatus, VersionStatus>('/version')
  },
}
