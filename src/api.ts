import { demoCommissions, demoGuest, demoInvite, demoKnowledge, demoNodes, demoNotices, demoOrders, demoPlans, demoSubscribe, demoTickets, demoTraffic, demoUser, demoUserConfig } from './demo'

const AUTH_KEY = 'SHENLAN_AUTH_DATA'
const LEGACY_AUTH_KEY = 'NOVA_AUTH_DATA'
export const isDemo = import.meta.env.DEV
export const getAuth = () => localStorage.getItem(AUTH_KEY) || localStorage.getItem(LEGACY_AUTH_KEY) || ''
export const setAuth = (value: string) => {
  if (value) localStorage.setItem(AUTH_KEY, value)
  else { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(LEGACY_AUTH_KEY) }
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

function demoResponse(path: string, params?: Record<string, unknown>): unknown {
  if (path.includes('/guest/comm/config')) return demoGuest
  if (path.includes('/passport/auth/')) return { token: 'demo-token', is_admin: 0, auth_data: 'demo-auth-data' }
  if (path.endsWith('/user/info')) return demoUser
  if (path.endsWith('/user/getSubscribe')) return demoSubscribe
  if (path.endsWith('/user/getStat')) return [1, 1, 8]
  if (path.includes('/user/comm/config')) return demoUserConfig
  if (path.includes('/plan/fetch')) return params?.id ? demoPlans.find((p) => p.id === Number(params.id)) : demoPlans
  if (path.includes('/server/fetch')) return demoNodes
  if (path.includes('/notice/fetch')) return demoNotices
  if (path.includes('/knowledge/fetch')) {
    if (params?.id) return { ...Object.values(demoKnowledge).flat().find((item) => item.id === Number(params.id)), body: '<h2>轻松开始使用</h2><p>复制仪表盘中的订阅链接，然后在对应客户端内选择“从剪贴板导入”。</p><p>连接前建议先执行一次延迟测试，系统会自动推荐当前网络下的最佳线路。</p>' }
    return demoKnowledge
  }
  if (path.includes('/invite/fetch')) return demoInvite
  if (path.includes('/invite/details')) return demoCommissions
  if (path.includes('/order/fetch')) return demoOrders
  if (path.includes('/ticket/fetch')) return params?.id ? demoTickets.find((ticket) => ticket.id === Number(params.id)) : demoTickets
  if (path.includes('/stat/getTrafficLog')) return demoTraffic
  if (path.includes('/order/getPaymentMethod')) return [{ id: 1, name: '支付宝', payment: 'AlipayF2F', handling_fee_fixed: 100, handling_fee_percent: 2 }]
  if (path.includes('/order/save')) {
    const tradeNo = `SHENLAN${Date.now()}`
    const plan = demoPlans.find((item) => item.id === Number(params?.plan_id))
    const period = String(params?.period || 'month_price')
    const totalAmount = plan ? Number(plan[period as keyof typeof plan] || 0) : Number(params?.deposit_amount || 0)
    demoOrders.unshift({ trade_no: tradeNo, plan_id: plan?.id || 0, period, total_amount: totalAmount, status: 0, created_at: Math.floor(Date.now() / 1000), plan })
    return tradeNo
  }
  if (path.includes('/order/checkout')) return true
  return true
}

export interface ApiEnvelope<T> { data: T; type?: number; message?: string }

export async function apiEnvelope<T>(path: string, options: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; auth?: boolean } = {}): Promise<ApiEnvelope<T>> {
  const method = options.method || 'GET'
  const params = options.params || {}
  if (isDemo) {
    await new Promise((resolve) => setTimeout(resolve, 180))
    return { data: clone(demoResponse(path, params)) as T, type: path.includes('/order/checkout') ? -1 : undefined }
  }

  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.set(key, String(value))
  })
  const headers: Record<string, string> = { Accept: 'application/json' }
  const authData = getAuth()
  if (options.auth !== false && authData) headers.Authorization = authData
  if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
  const response = await fetch(method === 'GET' && query.size ? `${path}?${query}` : path, { method, headers, body: method === 'POST' ? query : undefined })
  const payload = await response.json().catch(() => ({})) as { data?: T; type?: number; message?: string; errors?: Record<string, string[]> }
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors).flat()[0] : undefined
    throw new Error(firstError || payload.message || `请求失败 (${response.status})`)
  }
  return { data: payload.data as T, type: payload.type, message: payload.message }
}

export async function api<T>(path: string, options: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; auth?: boolean } = {}): Promise<T> {
  return (await apiEnvelope<T>(path, options)).data
}
