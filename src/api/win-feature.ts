import request from './request'
import type { WinFeatureKey, WinFeaturePolicy, WinFeatureUpdateResponse } from '@/types/api'

export const winFeatureApi = {
  list() {
    return request.get<WinFeaturePolicy, WinFeaturePolicy>('/admin/win-features')
  },
  updateGlobal(feature: WinFeatureKey, disabled: boolean) {
    return request.put<WinFeatureUpdateResponse, WinFeatureUpdateResponse>(`/admin/win-features/${feature}/global`, { disabled })
  },
  updateCompany(feature: WinFeatureKey, companyId: number, disabled: boolean) {
    return request.put<WinFeatureUpdateResponse, WinFeatureUpdateResponse>(`/admin/win-features/${feature}/company/${companyId}`, { disabled })
  },
}
