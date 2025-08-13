import { format, parseISO, startOfDay, endOfDay } from 'date-fns'

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM-dd')
}

export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'HH:mm')
}

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM-dd HH:mm')
}

export const formatKoreanTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'a h:mm', { locale: undefined })
}

export const getTodayString = (): string => {
  return format(new Date(), 'yyyy-MM-dd')
}

export const getTomorrowString = (): string => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return format(tomorrow, 'yyyy-MM-dd')
}

export const nearestFutureHalfHour = (): Date => {
  const d = new Date()
  const m = d.getMinutes()
  const rounded = m < 30 ? 30 : 60
  if (rounded === 60) d.setHours(d.getHours() + 1)
  d.setMinutes(rounded % 60, 0, 0)
  return d
}

export const tomorrowStart = (): Date => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export const tomorrowEnd = (): Date => {
  const d = tomorrowStart()
  d.setHours(23, 30, 0, 0)
  return d
}

export const roundToHalfHour = (date: Date): Date => {
  const m = date.getMinutes()
  const r = m < 15 ? 0 : m < 45 ? 30 : 0
  if (r === 0 && m >= 45) date.setHours(date.getHours() + 1)
  date.setMinutes(r, 0, 0)
  return date
}
