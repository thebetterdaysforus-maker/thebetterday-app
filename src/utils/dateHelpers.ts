// date-fns 제거하고 네이티브 Date 사용

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0] // YYYY-MM-DD
}

export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const datePart = dateObj.toISOString().split('T')[0]
  const timePart = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${datePart} ${timePart}`
}

export const formatKoreanTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0]
}

export const getTomorrowString = (): string => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
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
