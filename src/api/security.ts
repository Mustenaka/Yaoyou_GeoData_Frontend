import request from './request'
import type {
  PageResult,
  RiskHandlePayload,
  RiskListParams,
  SecurityRiskEvent,
  ServerTimeLogItem,
  ServerTimeLogParams,
  DeviceIPObservation,
  IPBlockRule,
  IPSecurityStats,
  WinRemovalOrder,
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
  ipRules(params: Record<string, unknown>) {
    return request.get<PageResult<IPBlockRule>, PageResult<IPBlockRule>>('/admin/security/ip-rules', { params })
  },
  createIPRule(payload: {
    ip: string
    client_scope: string
    reason: string
    expires_at?: string | null
    danger_confirm: boolean
  }) {
    return request.post<IPBlockRule, IPBlockRule>('/admin/security/ip-rules', payload)
  },
  setIPRuleStatus(id: number, status: 'active' | 'disabled', dangerConfirm = false) {
    return request.put<IPBlockRule, IPBlockRule>(`/admin/security/ip-rules/${id}/status`, {
      status,
      danger_confirm: dangerConfirm,
    })
  },
  ipObservations(params: Record<string, unknown>) {
    return request.get<PageResult<DeviceIPObservation>, PageResult<DeviceIPObservation>>('/admin/security/ip-observations', { params })
  },
  removalOrders(params: Record<string, unknown>) {
    return request.get<PageResult<WinRemovalOrder>, PageResult<WinRemovalOrder>>('/admin/security/removal-orders', { params })
  },
  revokeRemovalOrder(orderId: string, reason: string) {
    return request.post<WinRemovalOrder, WinRemovalOrder>(`/admin/security/removal-orders/${orderId}/revoke`, {
      reason,
      danger_confirm: true,
    })
  },
  ipSecurityStats() {
    return request.get<IPSecurityStats, IPSecurityStats>('/admin/security/ip-safety/stats')
  },
}
