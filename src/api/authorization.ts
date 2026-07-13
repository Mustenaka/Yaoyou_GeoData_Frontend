import request from './request'
import type {
  AuthorizationPageResult,
  DeviceBindingItem,
  DeviceBindingListParams,
  DeviceBindingUpdatePayload,
  ProductEntitlementItem,
  ProductEntitlementListParams,
  ProductEntitlementPayload,
} from '@/types/api'

export const productEntitlementApi = {
  list(params: ProductEntitlementListParams) {
    return request.get<AuthorizationPageResult<ProductEntitlementItem>, AuthorizationPageResult<ProductEntitlementItem>>(
      '/admin/product-entitlements',
      { params },
    )
  },
  detail(id: number) {
    return request.get<ProductEntitlementItem, ProductEntitlementItem>(`/admin/product-entitlements/${id}`)
  },
  create(payload: ProductEntitlementPayload) {
    return request.post<ProductEntitlementItem, ProductEntitlementItem>('/admin/product-entitlements', payload)
  },
  update(id: number, payload: ProductEntitlementPayload) {
    return request.put<ProductEntitlementItem, ProductEntitlementItem>(`/admin/product-entitlements/${id}`, payload)
  },
}

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
  revoke(id: number, reason: string) {
    return request.post<DeviceBindingItem, DeviceBindingItem>(`/admin/device-bindings/${id}/revoke`, { reason })
  },
}
