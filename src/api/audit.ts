import request from './request'
import type { AuditListParams, OperationAuditEvent, PageResult } from '@/types/api'

export const auditApi = {
  list(params: AuditListParams) {
    return request.get<PageResult<OperationAuditEvent>, PageResult<OperationAuditEvent>>('/admin/audit/events', { params })
  },
}
