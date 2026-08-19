import request from './request'

/**
 * 协作服务器控制面。
 *
 * 后台只管「登记与调度」：哪台服务器可以服务、哪家企业走哪台、配额多少。
 * 实时数据不经过这里——设备直连协作服务器，后台只收到计数，收不到任何单元格内容。
 */

export type CollabServerKind = 'official' | 'self_hosted'
export type CollabServerStatus = 'pending' | 'active' | 'suspended' | 'revoked'

export interface CollabServer {
  id: number
  company_id: number | null
  name: string
  kind: CollabServerKind
  base_url: string
  tls_fingerprint_sha256: string
  public_key_ed25519: string
  key_id: string
  status: CollabServerStatus
  grace_seconds: number
  lease_epoch: number
  revocation_epoch: number
  last_heartbeat_at?: string | null
  revoked_at?: string | null
  revoke_reason?: string
  proto_versions: string
  schema_version: number
  build_version: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface CollabServerPayload {
  name: string
  kind: CollabServerKind
  base_url: string
  public_key_ed25519: string
  key_id: string
  tls_fingerprint_sha256?: string
  company_id?: number | null
  grace_seconds?: number
}

export interface CollabCompanySetting {
  company_id: number
  collab_enabled: boolean
  server_id: number | null
  max_devices_per_project: number
  max_rows_per_project: number
  max_ops_per_sec: number
  updated_by: number
  created_at: string
  updated_at: string
}

export interface CollabSettingPayload {
  collab_enabled?: boolean
  server_id?: number | null
  max_devices_per_project?: number
  max_rows_per_project?: number
  max_ops_per_sec?: number
}

export interface CollabSignerHealth {
  ready: boolean
  algorithm: string
  key_id?: string
  error?: string
}

export const collabApi = {
  listServers() {
    return request.get<CollabServer[], CollabServer[]>('/admin/collab/servers')
  },
  registerServer(payload: CollabServerPayload) {
    return request.post<CollabServer, CollabServer>('/admin/collab/servers', payload)
  },
  /**
   * 吊销一台服务器。这会推进 revocation_epoch，已经发出去的票据随之失效，
   * 所以理由是必填的——它会进审计。
   */
  revokeServer(id: number, reason: string) {
    return request.post<CollabServer, CollabServer>(`/admin/collab/servers/${id}/revoke`, { reason })
  },
  companySetting(companyId: number) {
    return request.get<CollabCompanySetting, CollabCompanySetting>(`/admin/collab/settings/${companyId}`)
  },
  updateCompanySetting(companyId: number, payload: CollabSettingPayload) {
    return request.put<CollabCompanySetting, CollabCompanySetting>(`/admin/collab/settings/${companyId}`, payload)
  },
  signer() {
    return request.get<CollabSignerHealth, CollabSignerHealth>('/admin/collab/signer')
  },
}
