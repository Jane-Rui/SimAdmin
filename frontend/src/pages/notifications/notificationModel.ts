import type { ElementType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import {
  Business,
  Chat,
  Forum,
  Groups,
  NotificationsActive,
  PhoneIphone,
  Send,
  Webhook,
  Work,
} from '@mui/icons-material'
import type {
  MatcherOperator,
  NotificationChannelInstance,
  NotificationChannelKey,
  NotificationConfig,
  NotificationEventType,
  NotificationLogCleanupConfig,
  NotificationLogStatus,
  NotificationRule,
  QuietHoursSchedule,
} from '../../api/current'
export type IconComponent = ElementType<SvgIconProps>

export type ChannelDef = {
  key: NotificationChannelKey
  label: string
  icon: IconComponent
}

export type TemplateVariable = {
  label: string
  token: string
}

export const DEFAULT_LOG_CLEANUP: NotificationLogCleanupConfig = {
  retention_days_enabled: false,
  retention_days: 90,
  max_entries_enabled: false,
  max_entries: 10000,
}

export const CHANNEL_DEFS: ChannelDef[] = [
  { key: 'webhook', label: 'Webhook', icon: Webhook },
  { key: 'bark', label: 'Bark', icon: PhoneIphone },
  { key: 'pushplus', label: 'PushPlus', icon: NotificationsActive },
  { key: 'wecom_app', label: '企业微信应用消息', icon: Business },
  { key: 'wecom_robot', label: '企业微信群机器人', icon: Groups },
  { key: 'dingtalk_robot', label: '钉钉群自定义机器人', icon: Forum },
  { key: 'dingtalk_app', label: '钉钉企业内机器人', icon: Work },
  { key: 'feishu_robot', label: '飞书机器人', icon: Chat },
  { key: 'telegram', label: 'Telegram 机器人', icon: Send },
]

export const EVENT_TYPES: { key: NotificationEventType; label: string }[] = [
  { key: 'sms', label: '短信' },
  { key: 'ddns', label: 'DDNS' },
  { key: 'version_update', label: '版本更新' },
]

export const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]

export const MATCHER_OPERATORS: { value: MatcherOperator; label: string }[] = [
  { value: 'always', label: '全部匹配' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'equals', label: '等于' },
  { value: 'regex', label: '正则' },
]

export const MATCH_FIELDS: Record<NotificationEventType, { value: string; label: string }[]> = {
  sms: [
    { value: 'summary', label: '内容摘要' },
    { value: 'phone_number', label: '发送方号码' },
    { value: 'content', label: '短信内容' },
    { value: 'own_number', label: '本机号码' },
  ],
  ddns: [
    { value: 'summary', label: '内容摘要' },
    { value: 'domains', label: '域名' },
    { value: 'provider', label: '服务商' },
    { value: 'record_type', label: '记录类型' },
    { value: 'status', label: '状态' },
    { value: 'message', label: '消息' },
    { value: 'failure_count', label: '失败次数' },
  ],
  version_update: [
    { value: 'summary', label: '内容摘要' },
    { value: 'version', label: '版本号' },
    { value: 'asset_name', label: '固件包' },
    { value: 'commit', label: 'Commit' },
  ],
}

export const DEFAULT_TEMPLATES: Record<NotificationEventType, string> = {
  sms: '📱 短信通知\n号码: {{发送方号码}}\n内容: {{短信内容}}\n时间: {{时间}}\n来源: {{本机号码}}',
  ddns: 'DDNS 通知\n域名: {{域名}}\nIP 类型: {{IP类型}}\n新 IP: {{新IP}}\n旧 IP: {{旧IP}}\n服务商: {{服务商}}\n记录类型: {{记录类型}}\n状态: {{状态}}\n消息: {{消息}}\n更新时间: {{更新时间}}',
  version_update: '发现新版本\n固件包: {{固件包}}\n版本号: {{版本号}}\nCommit: {{Commit}}\n构建时间: {{构建时间}}\nMD5: {{MD5}}',
}

export const TEMPLATE_VARIABLES: Record<NotificationEventType, TemplateVariable[]> = {
  sms: [
    { label: '发送方号码', token: '{{发送方号码}}' },
    { label: '本机号码', token: '{{本机号码}}' },
    { label: '短信内容', token: '{{短信内容}}' },
    { label: '时间', token: '{{时间}}' },
    { label: '短信方向', token: '{{短信方向}}' },
    { label: '短信状态', token: '{{短信状态}}' },
  ],
  ddns: [
    { label: '域名', token: '{{域名}}' },
    { label: 'IP 类型', token: '{{IP类型}}' },
    { label: '新 IP', token: '{{新IP}}' },
    { label: '旧 IP', token: '{{旧IP}}' },
    { label: '服务商', token: '{{服务商}}' },
    { label: '记录类型', token: '{{记录类型}}' },
    { label: '状态', token: '{{状态}}' },
    { label: '消息', token: '{{消息}}' },
    { label: '失败次数', token: '{{失败次数}}' },
    { label: '更新时间', token: '{{更新时间}}' },
  ],
  version_update: [
    { label: '固件包', token: '{{固件包}}' },
    { label: '版本号', token: '{{版本号}}' },
    { label: 'Commit', token: '{{Commit}}' },
    { label: '构建时间', token: '{{构建时间}}' },
    { label: 'MD5', token: '{{MD5}}' },
  ],
}

export function createDefaultConfig(): NotificationConfig {
  return { version: 2, channels: [], rules: [], log_cleanup: { ...DEFAULT_LOG_CLEANUP } }
}

function normalizeRule(rule: NotificationRule): NotificationRule {
  const threshold = Number(rule.ddns_failure_threshold)
  return {
    ...rule,
    ddns_failure_threshold: Number.isFinite(threshold) && threshold > 0 ? Math.trunc(threshold) : 1,
  }
}

export function normalizeConfig(value?: NotificationConfig | null): NotificationConfig {
  if (!value) return createDefaultConfig()
  return {
    version: 2,
    channels: Array.isArray(value.channels) ? value.channels : [],
    rules: Array.isArray(value.rules) ? value.rules.map(normalizeRule) : [],
    log_cleanup: { ...DEFAULT_LOG_CLEANUP, ...(value.log_cleanup ?? {}) },
  }
}

export function channelDef(type: NotificationChannelKey) {
  return CHANNEL_DEFS.find((item) => item.key === type) ?? CHANNEL_DEFS[0]
}

export function eventLabel(type: NotificationEventType) {
  return EVENT_TYPES.find((item) => item.key === type)?.label ?? type
}

export function statusLabel(status: NotificationLogStatus) {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  if (status === 'quiet_hours') return '免打扰'
  if (status === 'unmatched') return '未匹配规则'
  if (status === 'threshold_waiting') return '未达阈值'
  return '无可用通道'
}

export function statusColor(status: NotificationLogStatus): 'primary' | 'error' | 'warning' | 'default' {
  if (status === 'success') return 'primary'
  if (status === 'failed') return 'error'
  if (status === 'quiet_hours') return 'warning'
  if (status === 'threshold_waiting') return 'warning'
  return 'default'
}

export function defaultChannelConfig(type: NotificationChannelKey): Record<string, unknown> {
  switch (type) {
    case 'webhook':
      return { url: '', secret: '', headers: {} }
    case 'bark':
      return { server_url: 'https://api.day.app', device_key: '', title_template: 'SimAdmin 通知', group: '', sound: '', level: '', icon: '', auto_copy: true, save_history: true }
    case 'pushplus':
      return { token: '', title_template: 'SimAdmin 通知', topic: '', template: 'txt', channel: '', option: '', callback_url: '' }
    case 'wecom_app':
      return { corp_id: '', agent_id: '', secret: '', to_user: '@all', to_party: '', to_tag: '', safe: false }
    case 'wecom_robot':
      return { webhook_url: '', key: '' }
    case 'dingtalk_robot':
      return { webhook_url: '', access_token: '', secret: '', at_mobiles: '', at_all: false }
    case 'dingtalk_app':
      return { app_key: '', app_secret: '', robot_code: '', open_conversation_id: '', msg_key: 'sampleText' }
    case 'feishu_robot':
      return { webhook_url: '', token: '', secret: '' }
    case 'telegram':
      return { bot_token: '', chat_id: '', parse_mode: '', disable_web_page_preview: true }
    default:
      return {}
  }
}

export function getString(config: Record<string, unknown>, key: string) {
  const value = config[key]
  return typeof value === 'string' ? value : ''
}

export function getBool(config: Record<string, unknown>, key: string) {
  return config[key] === true
}

export function headersToText(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ''
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join('\n')
}

export function textToHeaders(value: string) {
  const headers: Record<string, string> = {}
  value.split('\n').forEach((line) => {
    const index = line.indexOf(':')
    if (index <= 0) return
    const key = line.slice(0, index).trim()
    const headerValue = line.slice(index + 1).trim()
    if (key && headerValue) headers[key] = headerValue
  })
  return headers
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createChannel(type: NotificationChannelKey): NotificationChannelInstance {
  const def = channelDef(type)
  return {
    id: newId(type),
    type,
    name: def.label,
    enabled: true,
    config: defaultChannelConfig(type),
  }
}

export function createRule(type: NotificationEventType, channelIds: string[]): NotificationRule {
  return {
    id: newId(`rule-${type}`),
    type,
    name: `默认${eventLabel(type)}规则`,
    enabled: true,
    matcher: { field: 'summary', operator: 'always', value: '' },
    channel_ids: channelIds,
    template: DEFAULT_TEMPLATES[type],
    quiet_hours: [],
    ddns_failure_threshold: 1,
  }
}

export function createQuietSchedule(): QuietHoursSchedule {
  return { enabled: true, weekdays: [1, 2, 3, 4, 5, 6, 7], start: '22:00', end: '08:00' }
}
