import request from './request'
import type {
  ListParams,
  PageResult,
  RegistrationApprovePayload,
  RegistrationApplication,
  RegistrationApplicationPayload,
  RegistrationApplicationUpdatePayload,
  RegistrationApproveResponse,
  RegistrationReceipt,
  RegistrationSourceChannel,
  RegistrationStatus,
} from '@/types/api'

export interface RegistrationListParams extends ListParams {
  status?: RegistrationStatus
  source_channel?: RegistrationSourceChannel
  keyword?: string
  start_at?: string
  end_at?: string
}

export const registrationApi = {
  submit(payload: RegistrationApplicationPayload) {
    return request.post<RegistrationReceipt, RegistrationReceipt>('/registration/applications', payload)
  },
  list(params: RegistrationListParams) {
    return request.get<PageResult<RegistrationApplication>, PageResult<RegistrationApplication>>('/admin/registration/applications', { params })
  },
  detail(id: number) {
    return request.get<RegistrationApplication, RegistrationApplication>(`/admin/registration/applications/${id}`)
  },
  update(id: number, payload: RegistrationApplicationUpdatePayload) {
    return request.put<RegistrationApplication, RegistrationApplication>(`/admin/registration/applications/${id}`, payload)
  },
  approve(id: number, payload: RegistrationApprovePayload = {}) {
    return request.post<RegistrationApproveResponse, RegistrationApproveResponse>(`/admin/registration/applications/${id}/approve`, payload)
  },
  reject(id: number, note: string) {
    return request.post<RegistrationApplication, RegistrationApplication>(`/admin/registration/applications/${id}/reject`, { note })
  },
}
