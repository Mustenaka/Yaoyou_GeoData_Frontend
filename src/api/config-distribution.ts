import request, { downloadBlob } from './request'
import type { PageResult } from '@/types/api'

export type ConfigDistributionObjectType = 'smart_fill_config' | 'equipment_config'
export type ConfigDistributionScope = 'global' | 'company'
export type ConfigDistributionStatus = 'published' | 'revoked'
export type ConfigDistributionDownloadFormat = 'xlsx' | 'csv' | 'json'

export interface SmartFillConfigPayload {
  id: string
  name: string
  description?: string
  conditionColumns: string[]
  equalsColumn: string
  generateColumns: string[]
  conditionFormMap?: Record<string, string>
  generateFormMap?: Record<string, string>
  columnWidths?: Record<string, number>
  rows: Array<Record<string, string>>
}

export interface EquipmentConfigColumn {
  key: string
  label: string
  width?: number
  locked?: boolean
}

export interface EquipmentConfigPayload {
  key: string
  name: string
  description?: string
  builtin?: boolean
  defaultColumns?: EquipmentConfigColumn[]
  config: {
    columns: EquipmentConfigColumn[]
    rows: Array<Record<string, string>>
    updatedAt?: number
  }
}

export type ConfigDistributionPayload = SmartFillConfigPayload | EquipmentConfigPayload

export interface ConfigDistributionItem {
  id: number
  revision: number
  config_key: string
  object_type: ConfigDistributionObjectType
  config_name: string
  scope: ConfigDistributionScope
  company_id?: number | null
  company_name?: string
  version: string
  payload_hash: string
  source_filename: string
  source_file_hash: string
  source_size_bytes: number
  publish_note: string
  status: ConfigDistributionStatus
  created_by: number
  published_at: string
  revoked_at?: string | null
  created_at: string
  updated_at: string
  payload?: ConfigDistributionPayload
}

export interface ConfigDistributionListParams {
  page: number
  page_size: number
  object_type: ConfigDistributionObjectType
  scope?: ConfigDistributionScope
  company_id?: number
  status?: ConfigDistributionStatus
  keyword?: string
}

export interface ConfigDistributionPublishPayload {
  object_type: ConfigDistributionObjectType
  config_name: string
  scope: ConfigDistributionScope
  company_id?: number
  version?: string
  publish_note?: string
  file: File
}

export const configDistributionApi = {
  list(params: ConfigDistributionListParams): Promise<PageResult<ConfigDistributionItem>> {
    return request.get('/admin/mobile/config-distributions', { params })
  },
  detail(id: number): Promise<ConfigDistributionItem> {
    return request.get(`/admin/mobile/config-distributions/${id}`)
  },
  download(id: number, format: ConfigDistributionDownloadFormat): Promise<Blob> {
    return downloadBlob(`/admin/mobile/config-distributions/${id}/download`, { format })
  },
  publish(payload: ConfigDistributionPublishPayload): Promise<ConfigDistributionItem> {
    const data = new FormData()
    data.append('object_type', payload.object_type)
    data.append('config_name', payload.config_name)
    data.append('scope', payload.scope)
    if (payload.company_id) data.append('company_id', String(payload.company_id))
    if (payload.version?.trim()) data.append('version', payload.version.trim())
    if (payload.publish_note?.trim()) data.append('publish_note', payload.publish_note.trim())
    data.append('file', payload.file)
    return request.post('/admin/mobile/config-distributions', data)
  },
  revoke(id: number): Promise<ConfigDistributionItem> {
    return request.post(`/admin/mobile/config-distributions/${id}/revoke`)
  },
}
