import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const apiSource = await readFile(fileURLToPath(new URL('../api/log.ts', import.meta.url)), 'utf8')
const pageSource = await readFile(fileURLToPath(new URL('../pages/mobile-logs/index.vue', import.meta.url)), 'utf8')

assert.match(apiSource, /clientDelete\(id: number\)/)
assert.match(apiSource, /request\.delete<[^>]+>\(`\/admin\/logs\/client\/\$\{id\}`\)/)

assert.match(pageSource, /props\.clientType === 'win'/)
assert.match(pageSource, /logApi\.clientDelete\(row\.id\)/)
assert.match(pageSource, /type: 'error'/)
assert.match(pageSource, /positiveText: '确认永久删除'/)
assert.match(pageSource, /对应的存储文件和解析产生的审计事件/)
assert.match(pageSource, /rows\.value\.length === 1/)
assert.match(pageSource, /row\.upload_status === 'failed'/)
assert.match(pageSource, /row\.parse_status === 'parsed'/)
assert.match(pageSource, /日志仍在上传或解析/)

console.log('client log delete contract passed')
