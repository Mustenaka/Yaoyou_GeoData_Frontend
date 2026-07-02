import request from './request'
import type {
  MailDeliveryListParams,
  MailDeliveryListResponse,
  MailDeliveryLog,
  MailSettings,
  MailSettingsPayload,
} from '@/types/api'

export const mailApi = {
  settings() {
    return request.get<MailSettings, MailSettings>('/admin/mail/settings')
  },
  updateSettings(payload: MailSettingsPayload) {
    return request.put<MailSettings, MailSettings>('/admin/mail/settings', payload)
  },
  test(recipient: string) {
    return request.post<MailDeliveryLog, MailDeliveryLog>('/admin/mail/test', { recipient })
  },
  deliveries(params: MailDeliveryListParams) {
    return request.get<MailDeliveryListResponse, MailDeliveryListResponse>('/admin/mail/deliveries', { params })
  },
}
