import { useMemo, useRef, useState } from 'react'
import { useLoveStory } from '../context/LoveStoryContext'
import { DIARY_START_YEAR, DIARY_YEARS_COUNT, forceDiaryStartYear } from '../lib/date'

function formatDiaryDisplayDate(dateText) {
  const [year = '', month = '', day = ''] = String(dateText || '').split('-')
  if (!year || !month || !day) return dateText
  return `${year}-${month}-${day}`
}

function DiaryTimeline() {
  const { selectedDate, setSelectedDate, diaryEntries, updateDiaryEntry } = useLoveStory()
  const itemRefs = useRef({})
  const [activeYear, setActiveYear] = useState(() => diaryEntries[0]?.year ?? '')

  const years = useMemo(() => diaryEntries.map((entry) => entry.year), [diaryEntries])
  const currentActiveYear = years.includes(activeYear) ? activeYear : years[0]

  const jumpToYear = (year) => {
    setActiveYear(year)
    itemRefs.current[year]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="panel diary-panel">
      <div className="diary-hero">
        <div className="diary-hero__intro">
          <p className="panel__eyebrow">五年日记</p>
          <h2>同一天，跨五年（{DIARY_START_YEAR}-{DIARY_START_YEAR + DIARY_YEARS_COUNT - 1}）</h2>
        </div>
        <label className="date-picker date-picker--diary">
          <span>选择月日（固定 {DIARY_START_YEAR}）</span>
          <input
            type="date"
            value={selectedDate}
            min={`${DIARY_START_YEAR}-01-01`}
            max={`${DIARY_START_YEAR}-12-31`}
            onChange={(event) => setSelectedDate(forceDiaryStartYear(event.target.value))}
          />
        </label>
      </div>

      <div className="timeline-layout timeline-layout--diary">
        <aside className="timeline-index" aria-label="年份侧边索引">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`timeline-index__item${currentActiveYear === year ? ' is-active' : ''}`}
              onClick={() => jumpToYear(year)}
            >
              {year}
            </button>
          ))}
        </aside>

        <div className="timeline">
          {diaryEntries.map((entry) => (
            <article
              key={entry.id}
              className={`timeline__item${currentActiveYear === entry.year ? ' is-active' : ''}`}
              ref={(node) => {
                itemRefs.current[entry.year] = node
              }}
              onMouseEnter={() => setActiveYear(entry.year)}
            >
              <div className="timeline__dot" aria-hidden="true"></div>
              <div className="timeline__content">
                <div className="timeline__meta">
                  <strong>{entry.year}</strong>
                  <span>{formatDiaryDisplayDate(entry.date)}</span>
                </div>
                <textarea
                  value={entry.content}
                  onChange={(event) => updateDiaryEntry(entry.id, event.target.value)}
                  onFocus={() => setActiveYear(entry.year)}
                  placeholder="写下那一天的心情..."
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DiaryTimeline
