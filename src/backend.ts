// An empty host keeps the existing same-origin theme installation.
export function normalizeBackend(value: string = ''): string {
  if (!value.trim()) return ''
  const url = new URL(value.trim())
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.pathname !== '/')) {
    throw new Error('后端地址必须是完整的 HTTP(S) 域名，不包含路径、查询参数或登录信息')
  }
  return url.origin
}

export function backendUrl(path: string, host: string = ''): string {
  if (!path.startsWith('/api/')) throw new Error('无效的接口路径')
  return normalizeBackend(host) + path
}
