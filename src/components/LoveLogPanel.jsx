import { useMemo, useRef, useState } from 'react'
import { useLoveStory } from '../context/LoveStoryContext'

const RANGE_OPTIONS = [
  { key: 'week', label: '7 天', days: 7 },
  { key: 'month', label: '30 天', days: 30 },
  { key: 'all', label: '全部', days: Infinity },
]

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const WORD_LAYOUTS = [
  { left: '50%', top: '44%', translateX: '-50%', translateY: '-50%' },
  { left: '27%', top: '28%', translateX: '-50%', translateY: '-50%' },
  { left: '72%', top: '27%', translateX: '-50%', translateY: '-50%' },
  { left: '33%', top: '64%', translateX: '-50%', translateY: '-50%' },
  { left: '70%', top: '63%', translateX: '-50%', translateY: '-50%' },
  { left: '16%', top: '46%', translateX: '-50%', translateY: '-50%' },
  { left: '84%', top: '47%', translateX: '-50%', translateY: '-50%' },
  { left: '18%', top: '18%', translateX: '-50%', translateY: '-50%' },
  { left: '82%', top: '17%', translateX: '-50%', translateY: '-50%' },
  { left: '22%', top: '78%', translateX: '-50%', translateY: '-50%' },
  { left: '78%', top: '79%', translateX: '-50%', translateY: '-50%' },
  { left: '50%', top: '16%', translateX: '-50%', translateY: '-50%' },
]

const STOP_WORDS = new Set([
  '我们',
  '你们',
  '他们',
  '她们',
  '今天',
  '昨天',
  '就是',
  '然后',
  '因为',
  '所以',
  '已经',
  '真的',
  '这个',
  '那个',
  '一个',
  '一种',
  '一点',
  '一下',
  '自己',
  '觉得',
  '还有',
  '没有',
  '不是',
  '什么',
  '这样',
  '那种',
  '一下子',
  'ours',
  'with',
  'that',
  'this',
  'have',
  'from',
  'your',
  'into',
  'about',
])

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function normalizeWord(segment) {
  const trimmed = String(segment || '')
    .trim()
    .replace(/^[^\p{L}\p{N}\p{Script=Han}]+|[^\p{L}\p{N}\p{Script=Han}]+$/gu, '')
    .toLowerCase()

  if (!trimmed) return ''
  if (/^\d+$/.test(trimmed)) return ''
  if (STOP_WORDS.has(trimmed)) return ''
  if (/^[a-z]+$/i.test(trimmed) && trimmed.length < 3) return ''
  if (/^\p{Script=Han}+$/u.test(trimmed) && trimmed.length < 2) return ''
  return trimmed
}

function extractWords(content) {
  const text = String(content || '').trim()
  if (!text) return []

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
    return Array.from(segmenter.segment(text))
      .filter((item) => item.isWordLike)
      .map((item) => normalizeWord(item.segment))
      .filter(Boolean)
  }

  return text
    .split(/[，。！？；：“”‘’、,.!?;:\s/]+/g)
    .map(normalizeWord)
    .filter(Boolean)
}

function countCharacters(content) {
  return Array.from(String(content || '').replace(/\s+/g, '')).length
}

function summarizeLogs(logs) {
  const counts = new Map()
  let totalWords = 0
  let totalCharacters = 0

  logs.forEach((log) => {
    totalCharacters += countCharacters(log.content)
    extractWords(log.content).forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1)
      totalWords += 1
    })
  })

  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0], 'zh-CN')
  })

  return {
    totalWords,
    totalCharacters,
    uniqueWords: counts.size,
    primary: ranked[0] || null,
    ranked,
  }
}

function formatWeeklyGrowth(current, previous) {
  if (current === 0 && previous === 0) return '0%'
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const delta = ((current - previous) / previous) * 100
  const rounded = Math.round(delta)
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function LoveLogPanel() {
  const { authors, loveLogs, addLoveLog, updateLoveLog, deleteLoveLog } = useLoveStory()

  const uploadRef = useRef(null)
  const [draft, setDraft] = useState({ author: authors[0], content: '', images: [] })
  const [editingId, setEditingId] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [rangeKey, setRangeKey] = useState('month')

  const filteredLogs = useMemo(() => {
    const option = RANGE_OPTIONS.find((item) => item.key === rangeKey) || RANGE_OPTIONS[1]
    if (!Number.isFinite(option.days)) return loveLogs

    const now = Date.now()
    const threshold = now - option.days * 24 * 60 * 60 * 1000
    return loveLogs.filter((log) => {
      const time = new Date(log.createdAt).getTime()
      return Number.isFinite(time) && time >= threshold
    })
  }, [loveLogs, rangeKey])

  const weeklySummary = useMemo(() => {
    const now = Date.now()
    const currentStart = now - ONE_WEEK_MS
    const previousStart = now - ONE_WEEK_MS * 2

    const currentWeekLogs = loveLogs.filter((log) => {
      const time = new Date(log.createdAt).getTime()
      return Number.isFinite(time) && time >= currentStart
    })

    const previousWeekLogs = loveLogs.filter((log) => {
      const time = new Date(log.createdAt).getTime()
      return Number.isFinite(time) && time >= previousStart && time < currentStart
    })

    const allSummary = summarizeLogs(loveLogs)
    const currentWeekSummary = summarizeLogs(currentWeekLogs)
    const previousWeekSummary = summarizeLogs(previousWeekLogs)
    const topWord = allSummary.primary?.[0] || '暂无'
    const topWordCurrentCount = currentWeekSummary.primary?.[0] === topWord
      ? currentWeekSummary.primary?.[1] || 0
      : currentWeekSummary.ranked.find(([word]) => word === topWord)?.[1] || 0
    const topWordPreviousCount = previousWeekSummary.primary?.[0] === topWord
      ? previousWeekSummary.primary?.[1] || 0
      : previousWeekSummary.ranked.find(([word]) => word === topWord)?.[1] || 0

    return {
      totalLogs: loveLogs.length,
      totalCharacters: allSummary.totalCharacters,
      topWord,
      topWordCount: allSummary.primary?.[1] || 0,
      uniqueWords: allSummary.uniqueWords,
      totalLogsGrowth: formatWeeklyGrowth(currentWeekLogs.length, previousWeekLogs.length),
      totalCharactersGrowth: formatWeeklyGrowth(
        currentWeekSummary.totalCharacters,
        previousWeekSummary.totalCharacters,
      ),
      topWordGrowth: formatWeeklyGrowth(topWordCurrentCount, topWordPreviousCount),
      uniqueWordsGrowth: formatWeeklyGrowth(
        currentWeekSummary.uniqueWords,
        previousWeekSummary.uniqueWords,
      ),
    }
  }, [loveLogs])

  const wordStats = useMemo(() => {
    const summary = summarizeLogs(filteredLogs)
    const ranked = summary.ranked.slice(0, 12)

    const maxCount = ranked[0]?.[1] || 1

    return {
      totalCount: summary.totalWords,
      uniqueCount: summary.uniqueWords,
      primary: ranked[0] || null,
      words: ranked.map(([word, count], index) => ({
        word,
        count,
        emphasis: maxCount ? count / maxCount : 1,
        tilt: index % 3 === 0 ? -4 : index % 3 === 1 ? 0 : 5,
        layout: WORD_LAYOUTS[index] || WORD_LAYOUTS[index % WORD_LAYOUTS.length],
      })),
    }
  }, [filteredLogs])

  const appendImages = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return

    const imageDataList = await Promise.all(files.map(fileToDataUrl))
    setDraft((prev) => ({ ...prev, images: [...prev.images, ...imageDataList] }))
  }

  const handleFileChange = async (event) => {
    try {
      await appendImages(event.target.files)
    } finally {
      event.target.value = ''
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    await appendImages(event.dataTransfer.files)
  }

  const handleAdd = (event) => {
    event.preventDefault()
    const ok = addLoveLog(draft)
    if (ok) {
      setDraft((prev) => ({ ...prev, content: '', images: [] }))
    }
  }

  const startEdit = (log) => {
    setEditingId(log.id)
    setEditingContent(log.content)
  }

  const saveEdit = () => {
    const ok = updateLoveLog(editingId, editingContent)
    if (!ok) return
    setEditingId('')
    setEditingContent('')
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditingContent('')
  }

  return (
    <section className="panel love-panel aura-love-panel">
      <header className="aura-love-hero">
        <div className="aura-love-hero__copy">
          <span className="aura-love-hero__eyebrow">恋爱记录词频分析</span>
          <h2>词频统计</h2>
          <p>把你们反复提到的情绪、承诺和昵称，整理成一页可视化恋爱档案。</p>
        </div>

        <div className="aura-love-range" role="tablist" aria-label="词频范围">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={rangeKey === option.key ? 'is-active' : ''}
              onClick={() => setRangeKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="aura-love-grid">
        <section className="aura-love-cloud-card">
          <div className="aura-love-cloud-card__glow aura-love-cloud-card__glow--primary" />
          <div className="aura-love-cloud-card__glow aura-love-cloud-card__glow--secondary" />
          <div className="aura-love-cloud">
            {wordStats.words.length ? (
              wordStats.words.map((item) => (
                <span
                  key={item.word}
                  className="aura-love-cloud__word"
                  style={{
                    left: item.layout.left,
                    top: item.layout.top,
                    fontSize: `${0.78 + item.emphasis * 3.2}rem`,
                    fontWeight: `${520 + Math.round(item.emphasis * 360)}`,
                    opacity: `${0.42 + item.emphasis * 0.56}`,
                    transform: `translate(${item.layout.translateX}, ${item.layout.translateY}) rotate(${item.tilt}deg)`,
                  }}
                >
                  {item.word}
                </span>
              ))
            ) : (
              <p className="empty-note">写下几条恋爱记录后，这里会自动生成高频词。</p>
            )}
          </div>
        </section>

        <aside className="aura-love-stats">
          <article className="aura-love-stat-card">
            <div className="aura-love-stat-card__head">
              <div>
                <span className="material-symbols-outlined">favorite</span>
                <em>恋爱记录总条数 · {weeklySummary.totalLogsGrowth}</em>
              </div>
              <strong>{weeklySummary.totalLogs}</strong>
            </div>
            <p>全部记录累计</p>
          </article>

          <article className="aura-love-stat-card">
            <div className="aura-love-stat-card__head">
              <div>
                <span className="material-symbols-outlined">notes</span>
                <em>全部字数 · {weeklySummary.totalCharactersGrowth}</em>
              </div>
              <strong>{weeklySummary.totalCharacters}</strong>
            </div>
            <p>累计写下的全部字数</p>
          </article>

          <article className="aura-love-stat-card">
            <div className="aura-love-stat-card__head">
              <div>
                <span className="material-symbols-outlined">auto_awesome</span>
                <em>最多出现 · {weeklySummary.topWordGrowth}</em>
              </div>
              <strong>{weeklySummary.topWord}</strong>
            </div>
            <p>{weeklySummary.topWordCount} 次出现</p>
          </article>

          <article className="aura-love-stat-card">
            <div className="aura-love-stat-card__head">
              <div>
                <span className="material-symbols-outlined">analytics</span>
                <em>数据汇总 · {weeklySummary.uniqueWordsGrowth}</em>
              </div>
              <strong>{weeklySummary.uniqueWords}</strong>
            </div>
            <p>去重后的累计词汇量</p>
          </article>
        </aside>

        <section className="aura-love-journal-card">
          <div className="aura-love-journal-card__glow" />
          <div className="aura-love-journal">
            <form className="aura-love-editor" onSubmit={handleAdd}>
              <div className="aura-love-editor__head">
                <div className="aura-love-editor__icon">
                  <span className="material-symbols-outlined">edit_note</span>
                </div>
                <div>
                  <h3>今日恋爱记录</h3>
                  <p>记录一句心动瞬间，它会同步进入词频统计。</p>
                </div>
              </div>

              <div className="aura-love-editor__controls">
                <select
                  value={draft.author}
                  onChange={(event) => setDraft({ ...draft, author: event.target.value })}
                  aria-label="记录作者"
                >
                  {authors.map((author) => (
                    <option key={author} value={author}>
                      {author}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                placeholder="今天有什么想记下来的温柔片段？"
              />

              <div
                className={`upload-dropzone aura-love-dropzone${isDragging ? ' upload-dropzone--active' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <p>拖拽图片到这里，或点击上传文件</p>
                <button className="ghost" type="button" onClick={() => uploadRef.current?.click()}>
                  上传图片
                </button>
                <input
                  ref={uploadRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </div>

              {draft.images.length > 0 ? (
                <div className="upload-preview">
                  {draft.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="upload-preview__item">
                      <img src={image} alt={`待上传图片 ${index + 1}`} />
                      <button
                        className="ghost danger"
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, imageIndex) => imageIndex !== index),
                          }))
                        }
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="aura-love-editor__footer">
                <span>字数：{draft.content.trim().length}</span>
                <button className="primary" type="submit">
                  保存到恋爱记录
                </button>
              </div>
            </form>

            <div className="aura-love-feed">
              <div className="aura-love-feed__head">
                <div>
                  <h3>恋爱记录展示</h3>
                  <p>共 {loveLogs.length} 条记录</p>
                </div>
              </div>

              <div className="aura-love-feed__list">
                {loveLogs.map((log) => (
                  <article key={log.id} className="aura-love-feed-card">
                    <div className="aura-love-feed-card__meta">
                      <span>{log.author}</span>
                      <time>{new Date(log.createdAt).toLocaleString('zh-CN')}</time>
                    </div>

                    {editingId === log.id ? (
                      <>
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                        />
                        <div className="row-actions">
                          <button className="primary" type="button" onClick={saveEdit}>
                            保存
                          </button>
                          <button className="ghost" type="button" onClick={cancelEdit}>
                            取消
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>{log.content}</p>
                        {Array.isArray(log.images) && log.images.length > 0 ? (
                          <div className="love-card__images aura-love-feed-card__images">
                            {log.images.map((image, index) => (
                              <img
                                key={`${log.id}-image-${index}`}
                                src={image}
                                alt={`${log.author} 上传的图片 ${index + 1}`}
                              />
                            ))}
                          </div>
                        ) : null}
                        <div className="row-actions">
                          <button className="ghost" type="button" onClick={() => startEdit(log)}>
                            编辑
                          </button>
                          <button
                            className="ghost danger"
                            type="button"
                            onClick={() => deleteLoveLog(log.id)}
                          >
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default LoveLogPanel
