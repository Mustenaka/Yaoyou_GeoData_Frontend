import request from './request'
import type {
  PageResult,
  RiskHandlePayload,
  RiskListParams,
  SecurityRiskEvent,
  ServerTimeLogItem,
  ServerTimeLogParams,
} from '@/types/api'

export const securityApi = {
  risks(params: RiskListParams) {
    return request.get<PageResult<SecurityRiskEvent>, PageResult<SecurityRiskEvent>>('/admin/security/risks', { params })
  },
  riskDetail(id: number) {
    return request.get<SecurityRiskEvent, SecurityRiskEvent>(`/admin/security/risks/${id}`)
  },
  handleRisk(id: number, payload: RiskHandlePayload) {
    return request.post<SecurityRiskEvent, SecurityRiskEvent>(`/admin/security/risks/${id}/handle`, payload)
  },
  serverTimeLogs(params: ServerTimeLogParams) {
    return request.get<PageResult<ServerTimeLogItem>, PageResult<ServerTimeLogItem>>('/admin/security/server-time-logs', { params })
  },
}
