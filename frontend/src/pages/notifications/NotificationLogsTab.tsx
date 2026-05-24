import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Popover,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  CalendarMonth,
  Close,
  Delete,
  DeleteSweep,
  FirstPage,
  SmartToy,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  LastPage,
  Search,
} from '@mui/icons-material'
import type { NotificationLogCleanupConfig, NotificationLogEntry } from '../../api/current'
import { EVENT_TYPES, eventLabel, statusLabel } from './notificationModel'

const LOG_STATUS_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'quiet_hours', label: '免打扰' },
  { value: 'unmatched', label: '未匹配规则' },
  { value: 'no_available_channel', label: '无可用通道' },
  { value: 'threshold_waiting', label: '未达阈值' },
]

const filterTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'transparent',
    borderRadius: 1.5,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'divider',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'text.disabled',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#1296DB',
    },
  },
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const DATE_RANGE_BUTTON_SX = {
  height: 40,
  minWidth: 260,
  justifyContent: 'space-between',
  px: 1.5,
  borderColor: 'divider',
  color: 'text.primary',
  fontWeight: 400,
  '&:hover': {
    borderColor: 'text.disabled',
    bgcolor: 'transparent',
  },
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function monthTitle(date: Date) {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`
}

function compareDateValue(left: string, right: string) {
  return left.localeCompare(right)
}

function monthGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

function logSummaryText(log: NotificationLogEntry) {
  if (log.status === 'failed' && log.message) return `${log.summary}；失败原因：${log.message}`
  if (log.status === 'quiet_hours' && log.message) return `${log.summary}；免打扰原因：${log.message}`
  if (log.status === 'unmatched' && log.message) return `${log.summary}；未匹配规则原因：${log.message}`
  if (log.status === 'no_available_channel' && log.message) return `${log.summary}；无可用通道原因：${log.message}`
  if (log.status === 'threshold_waiting' && log.message) return `${log.summary}；未达阈值原因：${log.message}`
  return log.summary
}

type NotificationLogClearFilters = {
  type: string
  status: string
  start_date: string
  end_date: string
}

type DateRangePickerProps = {
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
  minWidth?: number | string
  fullWidth?: boolean
}

function DateRangePicker({ startDate, endDate, onChange, minWidth = 260, fullWidth = false }: DateRangePickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [baseMonth, setBaseMonth] = useState(() => parseDateValue(startDate) ?? new Date())
  const [draftStart, setDraftStart] = useState(startDate)
  const [draftEnd, setDraftEnd] = useState(endDate)
  const [hoverDate, setHoverDate] = useState('')
  const open = Boolean(anchorEl)
  const displayText = startDate || endDate
    ? `${startDate || '不限'}  →  ${endDate || '不限'}`
    : '选择时间范围'

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setDraftStart(startDate)
    setDraftEnd(endDate)
    setHoverDate('')
    setBaseMonth(parseDateValue(startDate) ?? parseDateValue(endDate) ?? new Date())
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setHoverDate('')
    setAnchorEl(null)
  }

  const handleClear = () => {
    setDraftStart('')
    setDraftEnd('')
    setHoverDate('')
    onChange('', '')
    handleClose()
  }

  const handleDayClick = (value: string) => {
    if (!draftStart || draftEnd) {
      setDraftStart(value)
      setDraftEnd('')
      setHoverDate('')
      onChange(value, '')
      return
    }

    const nextStart = compareDateValue(value, draftStart) < 0 ? value : draftStart
    const nextEnd = compareDateValue(value, draftStart) < 0 ? draftStart : value
    setDraftStart(nextStart)
    setDraftEnd(nextEnd)
    setHoverDate('')
    onChange(nextStart, nextEnd)
    handleClose()
  }

  const renderMonth = (monthDate: Date) => (
    <Box sx={{ width: 270 }}>
      <Typography variant="subtitle2" textAlign="center" mb={1}>{monthTitle(monthDate)}</Typography>
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.25} mb={0.5}>
        {WEEKDAY_LABELS.map((label) => (
          <Typography key={label} variant="caption" textAlign="center" color="text.secondary">{label}</Typography>
        ))}
      </Box>
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0}>
        {monthGrid(monthDate).map((date) => {
          const value = formatDateValue(date)
          const inCurrentMonth = date.getMonth() === monthDate.getMonth()
          const previewEnd = draftStart && !draftEnd && hoverDate ? hoverDate : ''
          const rangeStart = previewEnd && compareDateValue(previewEnd, draftStart) < 0 ? previewEnd : draftStart
          const rangeEnd = draftEnd || previewEnd
          const isStart = value === draftStart
          const isEnd = value === draftEnd
          const isPreviewEnd = Boolean(previewEnd && value === previewEnd && value !== draftStart)
          const inRange = Boolean(rangeStart && rangeEnd && compareDateValue(value, rangeStart) > 0 && compareDateValue(value, rangeEnd) < 0)
          const previewActive = inRange || isPreviewEnd
          return (
            <Button
              key={value}
              size="small"
              onClick={() => handleDayClick(value)}
              onMouseEnter={() => setHoverDate(value)}
              sx={{
                minWidth: 0,
                height: 30,
                px: 0,
                border: '1px solid',
                borderColor: isPreviewEnd ? 'primary.main' : 'transparent',
                borderRadius: isStart || isEnd || isPreviewEnd ? 1 : 0,
                color: isStart || isEnd ? 'common.white' : inCurrentMonth ? 'text.primary' : 'text.disabled',
                bgcolor: isStart || isEnd ? 'primary.main' : previewActive ? 'rgba(18, 150, 219, 0.10)' : 'transparent',
                '&:hover': {
                  bgcolor: isStart || isEnd ? 'primary.dark' : previewActive ? 'rgba(18, 150, 219, 0.14)' : 'action.hover',
                },
              }}
            >
              {date.getDate()}
            </Button>
          )
        })}
      </Box>
    </Box>
  )

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleOpen}
        endIcon={<CalendarMonth fontSize="small" />}
        sx={[DATE_RANGE_BUTTON_SX, { minWidth, width: fullWidth ? '100%' : undefined }]}
      >
        <Typography variant="body2" noWrap>{displayText}</Typography>
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, p: 1.5, borderRadius: 1.5 } } }}
      >
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box>
              <IconButton size="small" onClick={() => setBaseMonth((current) => addMonths(current, -12))} aria-label="上一年">
                <KeyboardDoubleArrowLeft fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setBaseMonth((current) => addMonths(current, -1))} aria-label="上一月">
                <KeyboardArrowLeft fontSize="small" />
              </IconButton>
            </Box>
            <Button size="small" onClick={handleClear}>清除</Button>
            <Box>
              <IconButton size="small" onClick={() => setBaseMonth((current) => addMonths(current, 1))} aria-label="下一月">
                <KeyboardArrowRight fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setBaseMonth((current) => addMonths(current, 12))} aria-label="下一年">
                <KeyboardDoubleArrowRight fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box display="flex" gap={2} onMouseLeave={() => setHoverDate('')}>
            {renderMonth(baseMonth)}
            {renderMonth(addMonths(baseMonth, 1))}
          </Box>
        </Box>
      </Popover>
    </>
  )
}

type NotificationLogsTabProps = {
  logs: NotificationLogEntry[]
  logTotal: number
  logsLoading: boolean
  logType: string
  logStatus: string
  logStartDate: string
  logEndDate: string
  logCleanup: NotificationLogCleanupConfig
  cleanupSaving: boolean
  logQuery: string
  logPage: number
  logPageSize: number
  onLogTypeChange: (value: string) => void
  onLogStatusChange: (value: string) => void
  onLogDateRangeChange: (startDate: string, endDate: string) => void
  onLogQueryChange: (value: string) => void
  onLogPageChange: (page: number) => void
  onClearLogs: (filters: NotificationLogClearFilters) => void
  onSaveLogCleanup: (logCleanup: NotificationLogCleanupConfig) => void
}

export default function NotificationLogsTab({
  logs,
  logTotal,
  logsLoading,
  logType,
  logStatus,
  logStartDate,
  logEndDate,
  logCleanup,
  cleanupSaving,
  logQuery,
  logPage,
  logPageSize,
  onLogTypeChange,
  onLogStatusChange,
  onLogDateRangeChange,
  onLogQueryChange,
  onLogPageChange,
  onClearLogs,
  onSaveLogCleanup,
}: NotificationLogsTabProps) {
  const pageCount = Math.max(1, Math.ceil(logTotal / logPageSize))
  const startRecord = logTotal === 0 ? 0 : logPage * logPageSize + 1
  const endRecord = Math.min(logTotal, (logPage + 1) * logPageSize)
  const canGoPrev = logPage > 0
  const canGoNext = logPage < pageCount - 1
  const [pageInput, setPageInput] = useState(() => String(logPage + 1))
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearType, setClearType] = useState(logType)
  const [clearStatus, setClearStatus] = useState(logStatus)
  const [clearStartDate, setClearStartDate] = useState(logStartDate)
  const [clearEndDate, setClearEndDate] = useState(logEndDate)
  const [autoDialogOpen, setAutoDialogOpen] = useState(false)
  const [autoRetentionEnabled, setAutoRetentionEnabled] = useState(logCleanup.retention_days_enabled)
  const [autoRetentionDays, setAutoRetentionDays] = useState(String(logCleanup.retention_days))
  const [autoMaxEntriesEnabled, setAutoMaxEntriesEnabled] = useState(logCleanup.max_entries_enabled)
  const [autoMaxEntries, setAutoMaxEntries] = useState(String(logCleanup.max_entries))

  useEffect(() => {
    setPageInput(String(logPage + 1))
  }, [logPage])

  const commitPageInput = () => {
    const parsed = Number(pageInput)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setPageInput(String(logPage + 1))
      return
    }
    const nextPage = Math.min(pageCount, Math.max(1, Math.trunc(parsed))) - 1
    setPageInput(String(nextPage + 1))
    if (nextPage !== logPage) onLogPageChange(nextPage)
  }

  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      commitPageInput()
    }
  }

  const openClearDialog = () => {
    setClearType(logType)
    setClearStatus(logStatus)
    setClearStartDate(logStartDate)
    setClearEndDate(logEndDate)
    setClearDialogOpen(true)
  }

  const openAutoDialog = () => {
    setAutoRetentionEnabled(logCleanup.retention_days_enabled)
    setAutoRetentionDays(String(logCleanup.retention_days))
    setAutoMaxEntriesEnabled(logCleanup.max_entries_enabled)
    setAutoMaxEntries(String(logCleanup.max_entries))
    setAutoDialogOpen(true)
  }

  const positiveInt = (value: string, fallback: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 1) return fallback
    return Math.trunc(parsed)
  }

  const confirmAutoCleanup = () => {
    onSaveLogCleanup({
      retention_days_enabled: autoRetentionEnabled,
      retention_days: positiveInt(autoRetentionDays, logCleanup.retention_days || 90),
      max_entries_enabled: autoMaxEntriesEnabled,
      max_entries: positiveInt(autoMaxEntries, logCleanup.max_entries || 10000),
    })
    setAutoDialogOpen(false)
  }

  const confirmClear = () => {
    onClearLogs({
      type: clearType,
      status: clearStatus,
      start_date: clearStartDate,
      end_date: clearEndDate,
    })
    setClearDialogOpen(false)
  }

  return (
    <Card sx={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, pb: 0, '&:last-child': { pb: 0 } }}>
        <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
          <TextField
            select
            size="small"
            label="消息类型"
            value={logType}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onLogTypeChange(event.target.value)}
            sx={[{ minWidth: 150 }, filterTextFieldSx]}
          >
            <MenuItem value="">所有消息类型</MenuItem>
            {EVENT_TYPES.map((type) => <MenuItem key={type.key} value={type.key}>{type.label}</MenuItem>)}
          </TextField>
          <TextField
            select
            size="small"
            label="状态"
            value={logStatus}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onLogStatusChange(event.target.value)}
            sx={[{ minWidth: 140 }, filterTextFieldSx]}
          >
            <MenuItem value="">所有状态</MenuItem>
            {LOG_STATUS_OPTIONS.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
          </TextField>
          <DateRangePicker startDate={logStartDate} endDate={logEndDate} onChange={onLogDateRangeChange} minWidth={280} />
          <TextField
            size="small"
            value={logQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onLogQueryChange(event.target.value)}
            placeholder="搜索关键字..."
            sx={[{ minWidth: { xs: '100%', sm: 260 } }, filterTextFieldSx]}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, minHeight: 0 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 150, fontWeight: 400 }}>时间</TableCell>
                <TableCell sx={{ width: 96, fontWeight: 400 }}>类型</TableCell>
                <TableCell sx={{ width: 88, fontWeight: 400 }}>状态</TableCell>
                <TableCell sx={{ width: '42%', minWidth: 360, fontWeight: 400 }}>内容摘要</TableCell>
                <TableCell sx={{ width: 160, fontWeight: 400 }}>转发规则</TableCell>
                <TableCell sx={{ width: 160, fontWeight: 400 }}>通知通道</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const summaryText = logSummaryText(log)
                return (
                  <TableRow key={log.id} sx={{ height: 40, '& .MuiTableCell-root': { py: 0.5 } }}>
                  <TableCell sx={{ width: 150, whiteSpace: 'nowrap', fontWeight: 400 }}>{log.created_at}</TableCell>
                  <TableCell sx={{ width: 96, fontWeight: 400 }}>{eventLabel(log.event_type)}</TableCell>
                  <TableCell
                    sx={{
                      width: 88,
                      fontWeight: 400,
                      color: log.status === 'success'
                        ? 'primary.main'
                        : log.status === 'failed'
                          ? 'error.main'
                          : log.status === 'quiet_hours' || log.status === 'threshold_waiting'
                            ? 'warning.main'
                            : 'text.secondary',
                    }}
                  >
                    {statusLabel(log.status)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 400 }} title={summaryText}>{summaryText}</TableCell>
                  <TableCell sx={{ fontWeight: 400 }}>{log.rule_name || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 400 }}>{log.channel_name || '-'}</TableCell>
                  </TableRow>
                )
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无转发日志</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ height: 56, minHeight: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0, gap: 1.5, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
              {logTotal === 0 ? '共 0 条记录' : `${startRecord}-${endRecord} / 共 ${logTotal} 条`}
            </Typography>
            <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', flex: '0 0 1px' }} />
            <Button size="small" variant="text" startIcon={<SmartToy />} onClick={openAutoDialog} sx={{ flexShrink: 0, minWidth: 88, whiteSpace: 'nowrap' }}>
              自动清理
            </Button>
            <Button size="small" color="error" variant="text" startIcon={<DeleteSweep />} onClick={openClearDialog} sx={{ flexShrink: 0, minWidth: 88, whiteSpace: 'nowrap' }}>
              高级清理
            </Button>
            {logsLoading && <CircularProgress size={16} sx={{ flexShrink: 0 }} />}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <IconButton size="small" disabled={!canGoPrev} onClick={() => onLogPageChange(0)} aria-label="第一页">
              <FirstPage fontSize="small" />
            </IconButton>
            <IconButton size="small" disabled={!canGoPrev} onClick={() => onLogPageChange(logPage - 1)} aria-label="上一页">
              <KeyboardArrowLeft fontSize="small" />
            </IconButton>
            <TextField
              size="small"
              value={pageInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = event.target.value
                if (/^\d{0,4}$/.test(next)) setPageInput(next)
              }}
              onBlur={commitPageInput}
              onKeyDown={handlePageInputKeyDown}
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  'aria-label': '页码',
                },
              }}
              sx={{
                width: 48,
                '& .MuiInputBase-input': {
                  py: 0.5,
                  px: 0.75,
                  textAlign: 'center',
                  fontSize: '0.875rem',
                },
              }}
            />
            <Typography variant="body2" color="text.secondary">/ {pageCount}</Typography>
            <IconButton size="small" disabled={!canGoNext} onClick={() => onLogPageChange(logPage + 1)} aria-label="下一页">
              <KeyboardArrowRight fontSize="small" />
            </IconButton>
            <IconButton size="small" disabled={!canGoNext} onClick={() => onLogPageChange(pageCount - 1)} aria-label="最后一页">
              <LastPage fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <DeleteSweep color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>高级清理日志</Typography>
          <Box flexGrow={1} />
          <IconButton size="small" onClick={() => setClearDialogOpen(false)} aria-label="关闭">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Box display="flex" flexDirection="column" gap={2}>            
            <Alert severity="warning">
              清理操作不可逆，请谨慎选择过滤条件。默认条件为当前表格的筛选状态。
            </Alert>
            <TextField
              select
              size="small"
              label="消息类型"
              value={clearType}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setClearType(event.target.value)}
              fullWidth
              sx={filterTextFieldSx}
            >
              <MenuItem value="">所有类型 (不限)</MenuItem>
              {EVENT_TYPES.map((type) => <MenuItem key={type.key} value={type.key}>{type.label}</MenuItem>)}
            </TextField>
            <TextField
              select
              size="small"
              label="转发状态"
              value={clearStatus}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setClearStatus(event.target.value)}
              fullWidth
              sx={filterTextFieldSx}
            >
              <MenuItem value="">所有状态 (不限)</MenuItem>
              {LOG_STATUS_OPTIONS.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
            </TextField>
            <Box>
              <Typography variant="body2" color="text.secondary" mb={1}>时间范围 (按日计算)</Typography>
              <DateRangePicker
                startDate={clearStartDate}
                endDate={clearEndDate}
                onChange={(startDate, endDate) => {
                  setClearStartDate(startDate)
                  setClearEndDate(endDate)
                }}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">留空表示不限制开始或结束时间</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setClearDialogOpen(false)}>取消</Button>
          <Button color="error" variant="contained" startIcon={<Delete />} onClick={confirmClear}>
            确认清理
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={autoDialogOpen} onClose={() => setAutoDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
          <SmartToy color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>自动清理设置</Typography>
          <Box flexGrow={1} />
          <IconButton size="small" onClick={() => setAutoDialogOpen(false)} aria-label="关闭">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Box display="flex" flexDirection="column" gap={3}>
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="subtitle2">按保留时长清理</Typography>
                <Switch
                  checked={autoRetentionEnabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAutoRetentionEnabled(event.target.checked)}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">超过设定天数的记录将被永久删除</Typography>
              <TextField
                size="small"
                type="number"
                value={autoRetentionDays}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const next = event.target.value
                  if (/^\d{0,5}$/.test(next)) setAutoRetentionDays(next)
                }}
                fullWidth
                disabled={!autoRetentionEnabled}
                sx={{ mt: 1, ...filterTextFieldSx }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">天</InputAdornment> },
                  htmlInput: { min: 1 },
                }}
              />
            </Box>
            <Box sx={{ borderTop: 1, borderColor: 'divider' }} />
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="subtitle2">按最大条数清理</Typography>
                <Switch
                  checked={autoMaxEntriesEnabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAutoMaxEntriesEnabled(event.target.checked)}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">总数超过此阈值时，自动删除最旧记录</Typography>
              <TextField
                size="small"
                type="number"
                value={autoMaxEntries}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const next = event.target.value
                  if (/^\d{0,8}$/.test(next)) setAutoMaxEntries(next)
                }}
                fullWidth
                disabled={!autoMaxEntriesEnabled}
                sx={{ mt: 1, ...filterTextFieldSx }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">条</InputAdornment> },
                  htmlInput: { min: 1 },
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setAutoDialogOpen(false)}>取消</Button>
          <Button variant="contained" disabled={cleanupSaving} onClick={confirmAutoCleanup}>
            保存设置
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
