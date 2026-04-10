import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import heroImage from '../assets/hero.png'
import { useAuth } from '../context/AuthContext'
import { useLoveStory } from '../context/LoveStoryContext'

const TOP_LINKS = [
  { to: '/', label: '整合页', end: true },
  { to: '/diary', label: '五年日记' },
  { to: '/love', label: '恋爱记录' },
  { to: '/map', label: '旅行地图' },
]

function byDiaryUpdatedDesc(a, b) {
  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
  if (dateDiff !== 0) return dateDiff
  return b.year - a.year
}

function byVisitedDesc(a, b) {
  return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
}

function getPhotosFromCities(cities) {
  return cities
    .flatMap((city) =>
      (Array.isArray(city.photos) ? city.photos : []).map((photo, index) => ({
        id: photo.id || `${city.id}-${index}`,
        city: city.city,
        province: city.province || '',
        visitedAt: city.visitedAt,
        url: typeof photo === 'string' ? photo : photo.url || '',
      })),
    )
    .filter((item) => item.url)
}

function shiftDateTime(date, { years = 0, months = 0, days = 0 }) {
  const next = new Date(date)
  if (Number.isFinite(years) || Number.isFinite(months)) {
    const totalMonths =
      next.getFullYear() * 12 + next.getMonth() + (Number(years) || 0) * 12 + (Number(months) || 0)
    const targetYear = Math.floor(totalMonths / 12)
    const targetMonth = totalMonths % 12
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
    const targetDay = Math.min(next.getDate(), lastDayOfMonth)
    next.setFullYear(targetYear, targetMonth, targetDay)
  }
  if (days) {
    next.setDate(next.getDate() + Number(days))
  }
  return next
}

function getLoveDuration(startValue, nowValue) {
  if (!startValue) return null
  const start = new Date(startValue)
  const now = new Date(nowValue)
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime()) return null

  let cursor = new Date(start)
  let years = 0
  let months = 0
  let days = 0

  while (shiftDateTime(cursor, { years: 1 }) <= now) {
    cursor = shiftDateTime(cursor, { years: 1 })
    years += 1
  }

  while (shiftDateTime(cursor, { months: 1 }) <= now) {
    cursor = shiftDateTime(cursor, { months: 1 })
    months += 1
  }

  while (shiftDateTime(cursor, { days: 1 }) <= now) {
    cursor = shiftDateTime(cursor, { days: 1 })
    days += 1
  }

  let remainder = now.getTime() - cursor.getTime()
  const hours = Math.floor(remainder / (1000 * 60 * 60))
  remainder -= hours * 1000 * 60 * 60
  const minutes = Math.floor(remainder / (1000 * 60))
  remainder -= minutes * 1000 * 60
  const seconds = Math.floor(remainder / 1000)

  return { years, months, days, hours, minutes, seconds }
}

function HomePage() {
  const { user, isAdmin } = useAuth()
  const {
    savedDiaryEntries,
    loveLogs,
    mapCities,
    homeCover,
    setHomeCover,
    moduleCovers,
    setModuleCover,
    relationshipStart,
    setRelationshipStart,
  } = useLoveStory()

  const uploaderRef = useRef(null)
  const moduleUploaderRefs = useRef({
    diary: null,
    love: null,
    map: null,
  })
  const [nowTick, setNowTick] = useState(() => Date.now())

  const latestDiary = useMemo(() => {
    const records = savedDiaryEntries
      .filter((item) => item.content && item.content.trim())
      .sort(byDiaryUpdatedDesc)
    return records[0] || null
  }, [savedDiaryEntries])

  const latestLove = useMemo(() => loveLogs[0] || null, [loveLogs])
  const latestTrip = useMemo(() => [...mapCities].sort(byVisitedDesc)[0] || null, [mapCities])
  const recentPhotos = useMemo(() => getPhotosFromCities(mapCities).slice(0, 3), [mapCities])

  const homeImage = homeCover || heroImage
  const diaryCount = savedDiaryEntries.filter((item) => item.content && item.content.trim()).length
  const loveCount = loveLogs.length
  const cityCount = mapCities.length
  const loveDuration = useMemo(
    () => getLoveDuration(relationshipStart, nowTick),
    [relationshipStart, nowTick],
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const importCoverImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return
      setHomeCover(dataUrl)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const importModuleCover = (moduleKey, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return
      setModuleCover(moduleKey, dataUrl)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <main className="home-luminous">
      <input
        ref={uploaderRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={importCoverImage}
      />

      <nav className="luminous-topbar">
        <div className="luminous-topbar__brand">恋爱纪念册</div>
        <div className="luminous-topbar__links">
          {TOP_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `luminous-topbar__link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink to="/me" className="luminous-topbar__link">
              我的
            </NavLink>
          ) : null}
        </div>
        <div className="luminous-topbar__actions">
          <div className="luminous-identity">
            <strong>{user?.username || '未登录用户'}</strong>
            <span>
              {isAdmin ? '管理员' : '用户'}
              {user?.matchCode ? ` · 匹配码 ${user.matchCode}` : ''}
            </span>
          </div>
          <button className="luminous-icon-button" type="button" onClick={() => uploaderRef.current?.click()}>
            <span className="material-symbols-outlined">favorite</span>
          </button>
          <div className="luminous-avatar">
            {user?.avatar ? <img src={user.avatar} alt={`${user?.username || '用户'}头像`} /> : <span>{user?.username?.[0] || '?'}</span>}
          </div>
        </div>
      </nav>

      <aside className="luminous-rail" aria-label="首页功能导航">
        <NavLink
          to="/diary"
          className={({ isActive }) => `luminous-rail__item${isActive ? ' is-active' : ''}`}
        >
          <span className="material-symbols-outlined">auto_stories</span>
          <span>五年日记</span>
        </NavLink>
        <NavLink
          to="/love"
          className={({ isActive }) => `luminous-rail__item${isActive ? ' is-active' : ''}`}
        >
          <span className="material-symbols-outlined">favorite</span>
          <span>恋爱记录</span>
        </NavLink>
        <NavLink
          to="/map"
          className={({ isActive }) => `luminous-rail__item${isActive ? ' is-active' : ''}`}
        >
          <span className="material-symbols-outlined">explore</span>
          <span>旅行地图</span>
        </NavLink>
        {isAdmin ? (
          <NavLink
            to="/me"
            className={({ isActive }) => `luminous-rail__item${isActive ? ' is-active' : ''}`}
          >
            <span className="material-symbols-outlined">shield_person</span>
            <span>我的</span>
          </NavLink>
        ) : null}
      </aside>

      <div className="luminous-canvas">
        <section className="luminous-stage">
          <header className="luminous-stage__header">
            <div>
              <p className="luminous-stage__eyebrow">z&z love story</p>
              <h1>我们已经相爱</h1>
              <div className="luminous-duration">
                <div className="luminous-duration__panel">
                  <div className="luminous-duration__head">
                    <p className="luminous-duration__caption">实时恋爱时长</p>
                    <label className="luminous-duration__picker">
                      <span>恋爱起始日期</span>
                      <input
                        type="datetime-local"
                        value={relationshipStart}
                        onChange={(event) => setRelationshipStart(event.target.value)}
                      />
                    </label>
                  </div>
                  {loveDuration ? (
                    <div className="luminous-duration__grid">
                      <div>
                        <strong>{loveDuration.years}</strong>
                        <span>年</span>
                      </div>
                      <div>
                        <strong>{loveDuration.months}</strong>
                        <span>月</span>
                      </div>
                      <div>
                        <strong>{loveDuration.days}</strong>
                        <span>日</span>
                      </div>
                      <div>
                        <strong>{loveDuration.hours}</strong>
                        <span>时</span>
                      </div>
                      <div>
                        <strong>{loveDuration.minutes}</strong>
                        <span>分</span>
                      </div>
                      <div>
                        <strong>{loveDuration.seconds}</strong>
                        <span>秒</span>
                      </div>
                    </div>
                  ) : (
                    <p className="luminous-duration__empty">
                      输入起始日期后，这里会实时显示你们已经相爱了多久。
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="luminous-stage__chips">
              <span>{diaryCount} 篇日记</span>
              <span>{loveCount} 条记录</span>
              <span>{cityCount} 座城市</span>
            </div>
          </header>

          <div className="luminous-stage__visual">
            <img src={homeImage} alt="整合页主视觉背景图" />
            <div className="luminous-stage__overlay" />
            <div className="luminous-stage__controls">
              <button className="luminous-control" type="button" onClick={() => uploaderRef.current?.click()}>
                <span className="material-symbols-outlined">add</span>
              </button>
              <NavLink className="luminous-control" to="/map">
                <span className="material-symbols-outlined">arrow_outward</span>
              </NavLink>
            </div>
          </div>

          <div className="luminous-stats">
            <article className="luminous-stat-card">
              <p>最新日记</p>
              <h3>{latestDiary ? latestDiary.year : '暂无'}</h3>
              <span>{latestDiary ? latestDiary.date : '等待记录'}</span>
            </article>
            <article className="luminous-stat-card">
              <p>最新恋爱记录</p>
              <h3>{latestLove ? latestLove.author : '暂无'}</h3>
              <span>{latestLove ? '最新心动片段已更新' : '等待记录'}</span>
            </article>
            <article className="luminous-stat-card">
              <p>旅行焦点</p>
              <h3>{latestTrip ? latestTrip.city : '暂无'}</h3>
              <span>{latestTrip ? `${latestTrip.photos.length} 张照片` : '等待点亮'}</span>
            </article>
          </div>
        </section>

        <aside className="luminous-sidebar">
          <section className="luminous-stack-card">
            <div className="luminous-stack-card__head">
              <h2>最近快照</h2>
              <div className="luminous-stack-card__actions">
                <button className="luminous-mini-button" type="button" onClick={() => uploaderRef.current?.click()}>
                  <span className="material-symbols-outlined">replay</span>
                </button>
                <NavLink className="luminous-mini-button is-primary" to="/map">
                  <span className="material-symbols-outlined">shuffle</span>
                </NavLink>
              </div>
            </div>

            <div className="luminous-photo-stack">
              {recentPhotos.length ? (
                recentPhotos.map((photo, index) => (
                  <NavLink
                    key={photo.id}
                    to="/map"
                    className={`luminous-photo-card luminous-photo-card--${index + 1}`}
                  >
                    <div className="luminous-photo-card__image">
                      <img src={photo.url} alt={`${photo.city} 旅行照片`} />
                    </div>
                    <p>{photo.city}</p>
                  </NavLink>
                ))
              ) : (
                <div className="luminous-photo-empty">
                  <p>上传旅行照片后，这里会生成最近快照堆叠效果。</p>
                </div>
              )}
            </div>
          </section>

          <section className="luminous-chapters">
            <h2>三个模块</h2>

            <article className="luminous-chapter">
              <NavLink to="/diary" className="luminous-chapter__main">
                <div className="luminous-chapter__thumb">
                  <img src={moduleCovers.diary || homeImage} alt="五年日记封面" />
                </div>
                <div>
                  <h4>五年日记</h4>
                  <p>{latestDiary ? latestDiary.content : '去写下第一条跨年同日记忆。'}</p>
                </div>
              </NavLink>
              <button className="luminous-chapter__upload" type="button" onClick={() => moduleUploaderRefs.current.diary?.click()}>
                <span className="material-symbols-outlined">add_a_photo</span>
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
            </article>

            <article className="luminous-chapter">
              <NavLink to="/love" className="luminous-chapter__main">
                <div className="luminous-chapter__thumb">
                  <img src={moduleCovers.love || homeImage} alt="恋爱记录封面" />
                </div>
                <div>
                  <h4>恋爱记录</h4>
                  <p>{latestLove ? latestLove.content : '去写下今天的小小心动。'}</p>
                </div>
              </NavLink>
              <button className="luminous-chapter__upload" type="button" onClick={() => moduleUploaderRefs.current.love?.click()}>
                <span className="material-symbols-outlined">add_a_photo</span>
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
            </article>

            <article className="luminous-chapter">
              <NavLink to="/map" className="luminous-chapter__main">
                <div className="luminous-chapter__thumb">
                  <img src={moduleCovers.map || recentPhotos[0]?.url || homeImage} alt="旅行地图封面" />
                </div>
                <div>
                  <h4>旅行地图</h4>
                  <p>{latestTrip ? `${latestTrip.city} · ${latestTrip.visitedAt}` : '去点亮下一座城市。'}</p>
                </div>
              </NavLink>
              <button className="luminous-chapter__upload" type="button" onClick={() => moduleUploaderRefs.current.map?.click()}>
                <span className="material-symbols-outlined">add_a_photo</span>
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
            </article>
          </section>
        </aside>
      </div>

      <button className="luminous-fab" type="button" onClick={() => uploaderRef.current?.click()}>
        <span className="material-symbols-outlined">add_a_photo</span>
      </button>
    </main>
  )
}

export default HomePage
