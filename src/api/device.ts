import request from './request'
import type {
  DeviceChangeRequest,
  DeviceChangeRequestListParams,
  DeviceAuthorizationBatchApprovePayload,
  DeviceAuthorizationBatchApproveResponse,
  DeviceAuthorizationDecisionPayload,
  DeviceDetail,
  DeviceExportAuthorizePayload,
  DeviceExportAuthorizeResponse,
  DeviceItem,
  DeviceRiskHandlePayload,
  DeviceRiskHandleResult,
  DeviceRiskItem,
  DeviceRiskListParams,
  DeviceStatus,
  ListParams,
  PageResult,
} from '@/types/api'

export const deviceApi = {
  list(params: ListParams) {
    return request.get<PageResult<DeviceItem>, PageResult<DeviceItem>>('/admin/devices', { params })
  },
  detail(id: number) {
    return request.get<DeviceDetail, DeviceDetail>(`/admin/devices/${id}`)
  },
  risks(params: DeviceRiskListParams) {
    return request.get<PageResult<DeviceRiskItem>, PageResult<DeviceRiskItem>>('/admin/devices/risks', { params })
  },
  handleRisk(deviceFingerprintId: number, payload: DeviceRiskHandlePayload) {
    return request.post<DeviceRiskHandleResult, DeviceRiskHandleResult>(`/admin/devices/risks/${deviceFingerprintId}/handle`, payload)
  },
  updateStatus(id: number, status: DeviceStatus, reason?: string) {
    return request.put(`/admin/devices/${id}/status`, { status, reason: reason || '' })
  },
  changeRequests(params: DeviceChangeRequestListParams) {
    return request.get<PageResult<DeviceChangeRequest>, PageResult<DeviceChangeRequest>>('/admin/devices/change-requests', {
      params,
    })
  },
  authorizeByExport(payload: DeviceExportAuthorizePayload) {
    return request.post<DeviceExportAuthorizeResponse, DeviceExportAuthorizeResponse>('/admin/devices/authorize-by-export', payload)
  },
  approveChangeRequest(id: number, payload: DeviceAuthorizationDecisionPayload = {}) {
    return request.post<DeviceChangeRequest, DeviceChangeRequest>(`/admin/devices/change-requests/${id}/approve`, payload)
  },
  batchApproveChangeRequests(payload: DeviceAuthorizationBatchApprovePayload) {
    return request.post<DeviceAuthorizationBatchApproveResponse, DeviceAuthorizationBatchApproveResponse>('/admin/devices/change-requests/batch-approve', payload)
  },
  rejectChangeRequest(id: number, note?: string) {
    return request.post<DeviceChangeRequest, DeviceChangeRequest>(`/admin/devices/change-requests/${id}/reject`, {
      note: note || '',
    })
  },
}
