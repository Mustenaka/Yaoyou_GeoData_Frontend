export const storageKeys = {
  accessToken: 'yaoyou_access_token',
  refreshToken: 'yaoyou_refresh_token',
  userId: 'yaoyou_user_id',
  username: 'yaoyou_username',
  roleCode: 'yaoyou_role_code',
  companyId: 'yaoyou_company_id',
  companyName: 'yaoyou_company_name',
  mustChangePassword: 'yaoyou_must_change_password',
  permissions: 'yaoyou_permissions',
  policy: 'yaoyou_policy',
}

export function clearSessionStorage() {
  Object.values(storageKeys).forEach((key) => localStorage.removeItem(key))
}
