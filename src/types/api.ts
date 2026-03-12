export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user_id: number
  username: string
  role: 'admin' | 'user'
}

export interface UserInfo {
  id: number
  username: string
  email: string
  phone: string
  company_id: number | null
  role: 'admin' | 'user'
  status: number
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface DeviceInfo {
  id: number
  user_id: number
  auth_type: string
  company_id: number | null
  device_id: string
  device_name: string
  device_type: string
  os_version: string
  app_version: string
  activation_status: number
  activated_at: string | null
  last_online_at: string | null
  created_at: string
  updated_at: string
}

export interface SystemLog {
  id: number
  log_type: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  message: string
  source: string
  trace_id: string
  created_at: string
}

export interface ClientLog {
  id: number
  user_id: number
  device_id: string
  log_file: string
  log_content: string
  app_version: string
  created_at: string
}

export interface ProjectInfo {
  id: number
  project_uuid: string
  project_no: string
  project_name: string
  client_name: string
  status: number
  creator_user_id: number
  description: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  role: string
  permission: string
  joined_at: string
  username: string
}

export interface RuntimeMetric {
  cpu_usage: number
  memory_usage?: number
  mem_usage?: number
  disk_usage: number
  goroutines: number
  active_ws: number
  timestamp: number
}
