export interface ThemeWindow {
  title?: string
  logo?: string
  description?: string
  assets_path?: string
  version?: string
  theme?: { color?: string; sidebar?: string; header?: string }
  shenlan?: { accent?: string; hero_title?: string; hero_description?: string }
}

export interface GuestConfig {
  tos_url?: string
  is_email_verify: number
  is_invite_force: number
  email_whitelist_suffix: string[] | 0
  is_recaptcha: number
  recaptcha_site_key?: string
  app_description?: string
  app_url?: string
  logo?: string
}

export interface UserInfo {
  email: string
  transfer_enable: number
  device_limit: number | null
  last_login_at: number
  created_at: number
  banned: number
  auto_renewal: number
  remind_expire: number
  remind_traffic: number
  expired_at: number | null
  balance: number
  commission_balance: number
  plan_id: number | null
  discount?: number | null
  commission_rate?: number | null
  telegram_id?: number | null
  uuid: string
  avatar_url?: string
}

export interface Plan {
  id: number
  group_id?: number
  name: string
  transfer_enable: number
  speed_limit?: number | null
  device_limit?: number | null
  content?: string | null
  month_price?: number | null
  quarter_price?: number | null
  half_year_price?: number | null
  year_price?: number | null
  two_year_price?: number | null
  three_year_price?: number | null
  onetime_price?: number | null
  reset_price?: number | null
  capacity_limit?: number | null
  show?: number
  renew?: number
}

export interface SubscribeInfo {
  plan_id: number | null
  token: string
  expired_at: number | null
  u: number
  d: number
  transfer_enable: number
  device_limit: number | null
  email: string
  uuid: string
  alive_ip: number
  subscribe_url: string
  reset_day: number | null
  allow_new_period: number
  plan?: Plan
}

export interface ServerNode {
  id: number
  name: string
  type: string
  rate?: string | number
  tags?: string[]
  host?: string
  online?: number
  last_check_at?: number
  is_online?: number
}

export interface NoticeItem {
  id: number
  title: string
  content: string
  created_at: number
  updated_at?: number
  img_url?: string | null
  tags?: string[] | null
}
export interface KnowledgeItem { id: number; category: string; title: string; updated_at: number; body?: string }
export interface InviteCode { id: number; code: string; status?: number }
export interface InviteData { codes: InviteCode[]; stat: [number, number, number, number, number] }
export interface CommissionLog { id: number; trade_no: string; order_amount: number; get_amount: number; created_at: number }

export interface OrderItem {
  trade_no: string
  plan_id: number
  period: string
  total_amount: number
  status: number
  created_at: number
  plan?: Plan
  handling_amount?: number | null
  balance_amount?: number
}

export interface TicketMessage { id: number; message: string; is_me: boolean; created_at: number }
export interface TicketItem { id: number; subject: string; level: number; status: number; created_at: number; updated_at?: number; message?: TicketMessage[] }
export interface TrafficLog { u: number; d: number; record_at: number; server_rate: number }
export interface UserConfig { currency: string; currency_symbol: string; is_telegram?: number; telegram_discuss_link?: string; withdraw_methods?: string[]; withdraw_close?: number }
