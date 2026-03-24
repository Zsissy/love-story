/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { buildFiveYears, forceDiaryStartYear, formatDate } from '../lib/date'
import { safeReadArray, saveJson } from '../lib/storage'

const DIARY_KEY = 'love-story-diary-v1'
const LOVE_KEY = 'love-story-love-logs-v1'
const MAP_KEY = 'love-story-map-cities-v1'

const AUTHORS = ['小茭', '小猪']

const DEFAULT_LOVE_LOGS = [
  {
    id: 'love-1',
    author: '小茭',
    content: '今天一起吃了可颂和豆浆，像在过小节日。',
    images: [],
    createdAt: '2026-03-24T08:12:00.000Z',
  },
  {
    id: 'love-2',
    author: '小猪',
    content: '看你认真写字的时候，突然觉得很安心。',
    images: [],
    createdAt: '2026-03-24T14:20:00.000Z',
  },
]

const DEFAULT_CITIES = [
  {
    id: 'city-bj',
    city: '北京',
    lat: 39.9042,
    lng: 116.4074,
    photos: [
      'https://images.unsplash.com/photo-1547981609-4b6bf67db2be?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=800&q=80',
    ],
    visitedAt: '2025-10-03',
  },
  {
    id: 'city-cd',
    city: '成都',
    lat: 30.5728,
    lng: 104.0668,
    photos: [
      'https://images.unsplash.com/photo-1552474705-dd8183e00901?auto=format&fit=crop&w=800&q=80',
    ],
    visitedAt: '2026-03-08',
  },
]

const CITY_COORDS = {
  北京: { lng: 116.4074, lat: 39.9042, province: '北京市' },
  上海: { lng: 121.4737, lat: 31.2304, province: '上海市' },
  广州: { lng: 113.2644, lat: 23.1291, province: '广东省' },
  深圳: { lng: 114.0579, lat: 22.5431, province: '广东省' },
  杭州: { lng: 120.1551, lat: 30.2741, province: '浙江省' },
  南京: { lng: 118.7969, lat: 32.0603, province: '江苏省' },
  苏州: { lng: 120.5853, lat: 31.2989, province: '江苏省' },
  武汉: { lng: 114.3054, lat: 30.5931, province: '湖北省' },
  成都: { lng: 104.0668, lat: 30.5728, province: '四川省' },
  重庆: { lng: 106.5516, lat: 29.563, province: '重庆市' },
  西安: { lng: 108.9398, lat: 34.3416, province: '陕西省' },
  天津: { lng: 117.2008, lat: 39.0842, province: '天津市' },
  青岛: { lng: 120.3826, lat: 36.0671, province: '山东省' },
  厦门: { lng: 118.0894, lat: 24.4798, province: '福建省' },
  三亚: { lng: 109.5119, lat: 18.2528, province: '海南省' },
  昆明: { lng: 102.8329, lat: 24.8801, province: '云南省' },
  长沙: { lng: 112.9388, lat: 28.2282, province: '湖南省' },
  郑州: { lng: 113.6254, lat: 34.7466, province: '河南省' },
  大连: { lng: 121.6147, lat: 38.914, province: '辽宁省' },
  哈尔滨: { lng: 126.6424, lat: 45.7569, province: '黑龙江省' },
}

function sortByDateDesc(items) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function normalizeLoveLogs(logs) {
  return logs.map((log) => ({
    ...log,
    author: log.author === '你' ? '小茭' : log.author,
    images: Array.isArray(log.images) ? log.images : [],
  }))
}

function normalizeMapPhoto(photo, index = 0) {
  if (typeof photo === 'string') {
    return {
      id: `legacy-photo-${index}`,
      url: photo,
      lat: null,
      lng: null,
      takenAt: '',
      admin: null,
    }
  }

  return {
    id: photo.id || `photo-${Date.now()}-${index}`,
    url: photo.url || '',
    lat: Number.isFinite(Number(photo.lat)) ? Number(photo.lat) : null,
    lng: Number.isFinite(Number(photo.lng)) ? Number(photo.lng) : null,
    takenAt: photo.takenAt || '',
    admin:
      photo.admin && typeof photo.admin === 'object'
        ? {
            province: photo.admin.province || '',
            city: photo.admin.city || '',
            district: photo.admin.district || '',
          }
        : null,
  }
}

function normalizeMapCities(cities) {
  return cities.map((city) => ({
    ...city,
    province: city.province || '',
    district: city.district || '',
    photos: Array.isArray(city.photos) ? city.photos.map(normalizeMapPhoto) : [],
  }))
}

function resolveCityCoordinate(cityName) {
  const clean = cityName.trim()
  if (!clean) return null
  if (CITY_COORDS[clean]) return CITY_COORDS[clean]
  if (clean.endsWith('市')) {
    const noSuffix = clean.slice(0, -1)
    if (CITY_COORDS[noSuffix]) return CITY_COORDS[noSuffix]
  }
  return null
}

const LoveStoryContext = createContext(null)

export function LoveStoryProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    forceDiaryStartYear(formatDate(new Date())),
  )
  const [savedDiaryEntries, setSavedDiaryEntries] = useState(() => safeReadArray(DIARY_KEY, []))
  const [loveLogs, setLoveLogs] = useState(() =>
    normalizeLoveLogs(safeReadArray(LOVE_KEY, DEFAULT_LOVE_LOGS)),
  )
  const [mapCities, setMapCities] = useState(() =>
    normalizeMapCities(safeReadArray(MAP_KEY, DEFAULT_CITIES)),
  )

  const diaryEntries = useMemo(() => {
    const base = buildFiveYears(selectedDate)
    return base.map((entry) => {
      const matched = savedDiaryEntries.find((item) => item.id === entry.id)
      return matched ? matched : entry
    })
  }, [savedDiaryEntries, selectedDate])

  useEffect(() => {
    saveJson(DIARY_KEY, savedDiaryEntries)
  }, [savedDiaryEntries])

  useEffect(() => {
    saveJson(LOVE_KEY, loveLogs)
  }, [loveLogs])

  useEffect(() => {
    saveJson(MAP_KEY, mapCities)
  }, [mapCities])

  const updateDiaryEntry = (entryId, content) => {
    setSavedDiaryEntries((prev) => {
      const index = prev.findIndex((entry) => entry.id === entryId)
      if (index === -1) {
        const newEntry = diaryEntries.find((entry) => entry.id === entryId)
        if (!newEntry) return prev
        return [...prev, { ...newEntry, content }]
      }

      const next = [...prev]
      next[index] = { ...next[index], content }
      return next
    })
  }

  const addLoveLog = (payload) => {
    const content = payload.content.trim()
    if (!content) return false

    const newLog = {
      id: `love-${Date.now()}`,
      author: payload.author,
      content,
      images: Array.isArray(payload.images) ? payload.images : [],
      createdAt: new Date().toISOString(),
    }

    setLoveLogs((prev) => sortByDateDesc([newLog, ...prev]))
    return true
  }

  const updateLoveLog = (id, content) => {
    const nextContent = content.trim()
    if (!nextContent) return false

    setLoveLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, content: nextContent } : log)),
    )
    return true
  }

  const deleteLoveLog = (id) => {
    setLoveLogs((prev) => prev.filter((log) => log.id !== id))
  }

  const addCity = (payload) => {
    const photos = Array.isArray(payload.photos)
      ? payload.photos.map(normalizeMapPhoto).filter((photo) => photo.url)
      : String(payload.photosText || '')
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((url, index) => normalizeMapPhoto({ id: `url-photo-${index}`, url }))

    const autoAdmin = photos.find((photo) => photo.admin)?.admin || null
    const city =
      payload.city.trim() ||
      autoAdmin?.city ||
      autoAdmin?.district ||
      autoAdmin?.province ||
      ''
    if (!city) {
      return { ok: false, message: '请输入城市名。' }
    }

    const matchedPhotoCoord = photos.find(
      (photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng),
    )
    const matchedCityCoord = resolveCityCoordinate(city)

    if (!matchedPhotoCoord && !matchedCityCoord) {
      return { ok: false, message: '暂未收录该城市坐标，请换一个城市名试试。' }
    }
    const lng = matchedPhotoCoord?.lng ?? matchedCityCoord?.lng
    const lat = matchedPhotoCoord?.lat ?? matchedCityCoord?.lat

    const newCity = {
      id: `city-${Date.now()}`,
      city,
      lat,
      lng,
      photos,
      province: autoAdmin?.province || matchedCityCoord?.province || '',
      district: autoAdmin?.district || '',
      visitedAt: payload.visitedAt || formatDate(new Date()),
    }

    setMapCities((prev) => [...prev, newCity])
    return { ok: true, cityId: newCity.id }
  }

  const deleteCity = (id) => {
    setMapCities((prev) => prev.filter((city) => city.id !== id))
  }

  const deleteCityPhoto = (cityId, photoId, photoIndex = -1) => {
    setMapCities((prev) =>
      prev.map((city) => {
        if (city.id !== cityId) return city

        const nextPhotos = (Array.isArray(city.photos) ? city.photos : []).filter(
          (photo, index) => {
            if (photoId) return photo.id !== photoId
            return index !== photoIndex
          },
        )

        return {
          ...city,
          photos: nextPhotos,
        }
      }),
    )
  }

  const value = {
    authors: AUTHORS,
    selectedDate,
    setSelectedDate,
    savedDiaryEntries,
    diaryEntries,
    updateDiaryEntry,
    loveLogs: sortByDateDesc(loveLogs),
    addLoveLog,
    updateLoveLog,
    deleteLoveLog,
    mapCities,
    addCity,
    deleteCity,
    deleteCityPhoto,
  }

  return <LoveStoryContext.Provider value={value}>{children}</LoveStoryContext.Provider>
}

export function useLoveStory() {
  const context = useContext(LoveStoryContext)
  if (!context) {
    throw new Error('useLoveStory must be used within LoveStoryProvider')
  }
  return context
}
