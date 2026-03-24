import { useMemo, useRef, useState } from 'react'
import heroImage from '../assets/hero.png'
import { useLoveStory } from '../context/LoveStoryContext'

const HOME_COVER_KEY = 'love-story-home-cover-v1'
const HOME_MODULE_COVERS_KEY = 'love-story-home-module-covers-v1'

function byDiaryUpdatedDesc(a, b) {
  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
  if (dateDiff !== 0) return dateDiff
  return b.year - a.year
}

function byVisitedDesc(a, b) {
  return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
}

function HomePage() {
  const { savedDiaryEntries, loveLogs, mapCities } = useLoveStory()
  const uploaderRef = useRef(null)
  const moduleUploaderRefs = useRef({
    diary: null,
    love: null,
    map: null,
  })
  const [coverImage, setCoverImage] = useState(() => {
    const cached = localStorage.getItem(HOME_COVER_KEY)
    return cached || heroImage
  })
  const [moduleCovers, setModuleCovers] = useState(() => {
    try {
      const cached = localStorage.getItem(HOME_MODULE_COVERS_KEY)
      if (!cached) return { diary: '', love: '', map: '' }
      const parsed = JSON.parse(cached)
      return {
        diary: parsed?.diary || '',
        love: parsed?.love || '',
        map: parsed?.map || '',
      }
    } catch {
      return { diary: '', love: '', map: '' }
    }
  })

  const latestDiary = useMemo(() => {
    const records = savedDiaryEntries
      .filter((item) => item.content && item.content.trim())
      .sort(byDiaryUpdatedDesc)
    return records[0] || null
  }, [savedDiaryEntries])

  const latestLove = useMemo(() => loveLogs[0] || null, [loveLogs])
  const latestTrip = useMemo(() => [...mapCities].sort(byVisitedDesc)[0] || null, [mapCities])

  const importCoverImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return
      setCoverImage(dataUrl)
      localStorage.setItem(HOME_COVER_KEY, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const importModuleCover = (moduleKey, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return

      setModuleCovers((prev) => {
        const next = { ...prev, [moduleKey]: dataUrl }
        localStorage.setItem(HOME_MODULE_COVERS_KEY, JSON.stringify(next))
        return next
      })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <main className="showcase showcase--home">
      <section className="showcase-cover">
        <input
          ref={uploaderRef}
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={importCoverImage}
        />
        <div
          className="showcase-cover__image"
          style={{ backgroundImage: `url("${coverImage}")` }}
          aria-label="整合页背景图"
        >
          <button
            className="ghost"
            type="button"
            onClick={() => uploaderRef.current?.click()}
          >
            导入背景图
          </button>
        </div>
      </section>

      <section className="showcase-modules" aria-label="最新更新">
        <article className={`showcase-card${moduleCovers.diary ? ' has-bg' : ''}`}>
          {moduleCovers.diary ? (
            <>
              <div
                className="showcase-card__bg"
                style={{ backgroundImage: `url("${moduleCovers.diary}")` }}
                aria-hidden="true"
              ></div>
              <div className="showcase-card__veil" aria-hidden="true"></div>
            </>
          ) : null}
          <div className="showcase-card__content">
            <div className="showcase-card__icon" aria-hidden="true">
              📔
            </div>
            <p className="showcase-card__tag">五年日记 · 最新</p>
            {latestDiary ? (
              <>
                <h3>
                  {latestDiary.date} · {latestDiary.year}
                </h3>
                <p>{latestDiary.content}</p>
              </>
            ) : (
              <>
                <h3>还没有更新</h3>
                <p>去五年日记页面写下第一条同日记忆吧。</p>
              </>
            )}
          </div>
          <div className="showcase-card__actions">
            <button
              className="ghost"
              type="button"
              onClick={() => moduleUploaderRefs.current.diary?.click()}
            >
              导入背景图
            </button>
            <input
              ref={(node) => {
                moduleUploaderRefs.current.diary = node
              }}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => importModuleCover('diary', event)}
            />
          </div>
        </article>

        <article className={`showcase-card${moduleCovers.love ? ' has-bg' : ''}`}>
          {moduleCovers.love ? (
            <>
              <div
                className="showcase-card__bg"
                style={{ backgroundImage: `url("${moduleCovers.love}")` }}
                aria-hidden="true"
              ></div>
              <div className="showcase-card__veil" aria-hidden="true"></div>
            </>
          ) : null}
          <div className="showcase-card__content">
            <div className="showcase-card__icon" aria-hidden="true">
              💌
            </div>
            <p className="showcase-card__tag">恋爱记录 · 最新</p>
            {latestLove ? (
              <>
                <h3>{latestLove.author}</h3>
                <p>{latestLove.content}</p>
              </>
            ) : (
              <>
                <h3>还没有更新</h3>
                <p>去恋爱记录页面添加你们今天的故事。</p>
              </>
            )}
          </div>
          <div className="showcase-card__actions">
            <button
              className="ghost"
              type="button"
              onClick={() => moduleUploaderRefs.current.love?.click()}
            >
              导入背景图
            </button>
            <input
              ref={(node) => {
                moduleUploaderRefs.current.love = node
              }}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => importModuleCover('love', event)}
            />
          </div>
        </article>

        <article className={`showcase-card${moduleCovers.map ? ' has-bg' : ''}`}>
          {moduleCovers.map ? (
            <>
              <div
                className="showcase-card__bg"
                style={{ backgroundImage: `url("${moduleCovers.map}")` }}
                aria-hidden="true"
              ></div>
              <div className="showcase-card__veil" aria-hidden="true"></div>
            </>
          ) : null}
          <div className="showcase-card__content">
            <div className="showcase-card__icon" aria-hidden="true">
              🧭
            </div>
            <p className="showcase-card__tag">旅行地图 · 最新</p>
            {latestTrip ? (
              <>
                <h3>{latestTrip.city}</h3>
                <p>
                  到访日期：{latestTrip.visitedAt}，照片数量：
                  {latestTrip.photos.length}
                </p>
              </>
            ) : (
              <>
                <h3>还没有更新</h3>
                <p>去旅行地图页面点亮第一座城市。</p>
              </>
            )}
          </div>
          <div className="showcase-card__actions">
            <button
              className="ghost"
              type="button"
              onClick={() => moduleUploaderRefs.current.map?.click()}
            >
              导入背景图
            </button>
            <input
              ref={(node) => {
                moduleUploaderRefs.current.map = node
              }}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => importModuleCover('map', event)}
            />
          </div>
        </article>
      </section>
    </main>
  )
}

export default HomePage
