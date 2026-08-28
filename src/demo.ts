import type { CommissionLog, GuestConfig, InviteData, KnowledgeItem, NoticeItem, OrderItem, Plan, ServerNode, SubscribeInfo, TicketItem, TrafficLog, UserConfig, UserInfo } from './types'

const now = Math.floor(Date.now() / 1000)
export const demoGuest: GuestConfig = { is_email_verify: 1, is_invite_force: 0, email_whitelist_suffix: 0, is_recaptcha: 0, app_description: '稳定、安全、快速地连接世界', app_url: location.origin }
export const demoUser: UserInfo = { email: 'demo@shenlan.example', transfer_enable: 200 * 1024 ** 3, device_limit: 5, last_login_at: now - 1200, created_at: now - 86400 * 180, banned: 0, auto_renewal: 1, remind_expire: 1, remind_traffic: 1, expired_at: now + 86400 * 61, balance: 8600, commission_balance: 12800, plan_id: 2, uuid: 'demo-user', avatar_url: '' }
export const demoPlans: Plan[] = [
  { id: 1, name: 'Lite 轻享', transfer_enable: 100, device_limit: 3, speed_limit: 500, month_price: 1300, quarter_price: 3500, half_year_price: 6500, year_price: 11900, reset_price: 800, content: '全球基础节点\n流媒体智能解锁\n3 台设备同时在线' },
  { id: 2, name: 'Pro 全球加速', transfer_enable: 200, device_limit: 5, speed_limit: 2000, month_price: 4400, quarter_price: 11800, half_year_price: 21800, year_price: 39800, two_year_price: 69800, reset_price: 1200, content: '全部高速节点\n流媒体与 AI 服务\n5 台设备同时在线\n优先技术支持' },
  { id: 3, name: 'Ultra 专线', transfer_enable: 500, device_limit: 10, speed_limit: 5000, month_price: 6900, quarter_price: 18800, half_year_price: 34800, year_price: 62800, onetime_price: 159900, reset_price: 1800, content: 'IEPL 专线节点\n低延迟游戏优化\n10 台设备同时在线\n专属客服通道' }
]
export const demoSubscribe: SubscribeInfo = { plan_id: 2, token: 'shenlan-demo-token', expired_at: now + 86400 * 61, u: 36 * 1024 ** 3, d: 100 * 1024 ** 3, transfer_enable: 200 * 1024 ** 3, device_limit: 5, email: demoUser.email, uuid: demoUser.uuid, alive_ip: 2, subscribe_url: `${location.origin}/api/v1/client/subscribe?token=shenlan-demo-token-8f1d2c4b6a7e90c3d5f84291bce7701f`, reset_day: 12, allow_new_period: 0, plan: demoPlans[1] }
export const demoNodes: ServerNode[] = [
  { id: 1, name: '香港 · Edge 01', type: 'vless', rate: '1', tags: ['流媒体', '低延迟'], is_online: 1, last_check_at: now - 20 },
  { id: 2, name: '日本 · Tokyo 03', type: 'vmess', rate: '1', tags: ['AI 服务'], is_online: 1, last_check_at: now - 35 },
  { id: 3, name: '新加坡 · Core 02', type: 'hysteria', rate: '1.5', tags: ['高速'], is_online: 1, last_check_at: now - 18 },
  { id: 4, name: '美国 · West 05', type: 'vless', rate: '1.5', tags: ['流媒体'], is_online: 1, last_check_at: now - 42 },
  { id: 5, name: '德国 · Frankfurt 01', type: 'trojan', rate: '2', tags: ['专线'], is_online: 0, last_check_at: now - 480 },
  { id: 6, name: '澳大利亚 · Sydney 02', type: 'shadowsocks', rate: '2', tags: ['低负载'], is_online: 1, last_check_at: now - 28 }
]
export const demoNotices: NoticeItem[] = [
  { id: 1, title: '香港核心节点维护完成', content: '相关线路已经恢复，系统将自动选择最佳节点。', created_at: now - 3600 },
  { id: 2, title: '新增新加坡高速线路', content: 'Pro 与 Ultra 套餐用户可以立即使用。', created_at: now - 86400 * 2 },
  { id: 3, title: '客户端版本更新提醒', content: '建议升级至最新版本以获得更稳定的连接体验。', created_at: now - 86400 * 5 }
]
export const demoKnowledge: Record<string, KnowledgeItem[]> = {
  '快速开始': [{ id: 1, category: '快速开始', title: '第一次使用 Shenlan', updated_at: now - 8000 }, { id: 2, category: '快速开始', title: '如何复制并导入订阅', updated_at: now - 16000 }],
  '客户端下载': [{ id: 3, category: '客户端下载', title: 'Windows 客户端教程', updated_at: now - 22000 }, { id: 4, category: '客户端下载', title: 'macOS 与 iOS 使用说明', updated_at: now - 28000 }, { id: 5, category: '客户端下载', title: 'Android 客户端教程', updated_at: now - 34000 }],
  '常见问题': [{ id: 6, category: '常见问题', title: '节点连接超时怎么办', updated_at: now - 42000 }, { id: 7, category: '常见问题', title: '如何查看流量明细', updated_at: now - 52000 }]
}
export const demoInvite: InviteData = { codes: [{ id: 1, code: 'SHENLANFREE' }], stat: [8, 25600, 4200, 30, 12800] }
export const demoCommissions: CommissionLog[] = [{ id: 1, trade_no: '20260828130201', order_amount: 4400, get_amount: 1320, created_at: now - 86400 }, { id: 2, trade_no: '20260818191412', order_amount: 11900, get_amount: 3570, created_at: now - 86400 * 10 }]
export const demoOrders: OrderItem[] = [{ trade_no: '20260828130201', plan_id: 2, period: 'month_price', total_amount: 4400, status: 0, created_at: now - 120, plan: demoPlans[1] }, { trade_no: '20260728110002', plan_id: 2, period: 'month_price', total_amount: 4400, status: 3, created_at: now - 86400 * 31, plan: demoPlans[1] }]
export const demoTickets: TicketItem[] = [{ id: 2815, subject: '连接问题咨询', level: 1, status: 0, created_at: now - 86400, message: [{ id: 1, message: '部分节点连接缓慢，请协助检查。', is_me: true, created_at: now - 86400 }, { id: 2, message: '已完成线路切换，请重新连接测试。', is_me: false, created_at: now - 82000 }] }]
export const demoTraffic: TrafficLog[] = Array.from({ length: 14 }, (_, i) => ({ u: (0.2 + (i % 3) * .1) * 1024 ** 3, d: (1.4 + (i % 5) * .6) * 1024 ** 3, record_at: now - i * 86400, server_rate: 1 }))
export const demoUserConfig: UserConfig = { currency: 'CNY', currency_symbol: '¥', is_telegram: 1, telegram_discuss_link: 'https://t.me/example', withdraw_methods: ['支付宝', 'USDT'], withdraw_close: 0 }
