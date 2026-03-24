export function formatDate(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

export const DIARY_START_YEAR = 2026
export const DIARY_YEARS_COUNT = 5

function pad(num) {
  return String(num).padStart(2, '0')
}

function makeSafeDate(year, month, day) {
  const date = new Date(year, month - 1, day)
  if (date.getMonth() + 1 !== month) {
    return new Date(year, month, 0)
  }
  return date
}

export function buildFiveYears(baseDateText) {
  const [, monthText, dayText] = baseDateText.split('-')
  const month = Number(monthText)
  const day = Number(dayText)

  return Array.from({ length: DIARY_YEARS_COUNT }, (_, index) => {
    const year = DIARY_START_YEAR + index
    const safeDate = makeSafeDate(year, month, day)
    const dateText = `${safeDate.getFullYear()}-${pad(
      safeDate.getMonth() + 1,
    )}-${pad(safeDate.getDate())}`

    return {
      id: `${dateText}-${year}`,
      date: dateText,
      year,
      content: '',
    }
  })
}

export function forceDiaryStartYear(dateText) {
  const [, monthText, dayText] = String(dateText || '').split('-')
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return `${DIARY_START_YEAR}-01-01`
  }

  const safeDate = makeSafeDate(DIARY_START_YEAR, month, day)
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`
}
