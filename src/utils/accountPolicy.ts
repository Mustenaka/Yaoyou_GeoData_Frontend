export const passwordPolicyText = '密码需为 8-16 位，包含大写英文、小写英文和数字，不能包含空格'

export function stripSpaces(value: string) {
  return value.replace(/\s+/g, '')
}

export function validateUsernameInput(value: string) {
  if (!value) return '请输入用户名'
  if (/\s/.test(value)) return '账号不能包含空格'
  return ''
}

export function validatePasswordInput(value: string) {
  if (!value) return '请输入密码'
  if (/\s/.test(value)) return '密码不能包含空格'
  if (value.length < 8 || value.length > 16) return '密码长度需为 8-16 位'
  if (!/[A-Z]/.test(value)) return '密码需包含大写英文'
  if (!/[a-z]/.test(value)) return '密码需包含小写英文'
  if (!/[0-9]/.test(value)) return '密码需包含数字'
  return ''
}

export function validateOptionalPasswordInput(value?: string | null) {
  if (!value) return ''
  return validatePasswordInput(value)
}
