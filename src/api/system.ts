import request from './request'
import type { HealthStatus } from '@/types/api'

export const systemApi = {
  health() {
    return request.get<HealthStatus, HealthStatus>('/health')
  },
}
