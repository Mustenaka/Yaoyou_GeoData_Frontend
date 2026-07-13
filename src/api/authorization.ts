import request from './request'
import type {
  AuthorizationPageResult,
  DeviceBindingItem,
  DeviceBindingListParams,
  DeviceBindingUpdatePayload,
} from '@/types/api'

export const deviceBindingApi = {
  list(params: DeviceBindingListParams) {
    return request.get<AuthorizationPageResult<DeviceBindingItem>, AuthorizationPageResult<DeviceBindingItem>>(
      '/admin/device-bindings',
      { params },
    )
  },
  detail(id: number) {
    return request.get<DeviceBindingItem, DeviceBindingItem>(`/admin/device-bindings/${id}`)
  },
  update(id: number, payload: DeviceBindingUpdatePayload) {
    return request.put<DeviceBindingItem, DeviceBindingItem>(`/admin/device-bindings/${id}`, payload)
  },
  revoke(id: number, expectedRevision: number, reason: string) {
    return request.post<DeviceBindingItem, DeviceBindingItem>(`/admin/device-bindings/${id}/revoke`, {
      expected_revision: expectedRevision,
      reason,
    })
  },
}
