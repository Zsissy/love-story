/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createClient } from '@supabase/supabase-js/dist/index.mjs'
import { buildFiveYears, forceDiaryStartYear, formatDate } from '../lib/date'
import { useAuth } from './AuthContext'

const ROOM_TABLE = 'app_sync_rooms'
const ROOM_LOCAL_PREFIX = 'love-story-room-v3'

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const IS_CLOUD_MODE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const supabase = IS_CLOUD_MODE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null

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

function normalizeModuleCovers(covers) {
  if (!covers || typeof covers !== 'object') {
    return { diary: '', love: '', map: '' }
  }
  return {
    diary: String(covers.diary || ''),
    love: String(covers.love || ''),
    map: String(covers.map || ''),
  }
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

function getDefaultRoomData() {
  return {
    selectedDate: forceDiaryStartYear(formatDate(new Date())),
    savedDiaryEntries: [],
    loveLogs: normalizeLoveLogs(DEFAULT_LOVE_LOGS),
    mapCities: normalizeMapCities(DEFAULT_CITIES),
    homeCover: '',
    moduleCovers: { diary: '', love: '', map: '' },
    updatedAt: '',
  }
}

function normalizeRoomData(payload) {
  const base = getDefaultRoomData()
  return {
    selectedDate: forceDiaryStartYear(payload?.selectedDate || payload?.selected_date || base.selectedDate),
    savedDiaryEntries: Array.isArray(payload?.savedDiaryEntries || payload?.diary_entries)
      ? payload.savedDiaryEntries || payload.diary_entries
      : [],
    loveLogs: normalizeLoveLogs(
      Array.isArray(payload?.loveLogs || payload?.love_logs)
        ? payload.loveLogs || payload.love_logs
        : base.loveLogs,
    ),
    mapCities: normalizeMapCities(
      Array.isArray(payload?.mapCities || payload?.map_cities)
        ? payload.mapCities || payload.map_cities
        : base.mapCities,
    ),
    homeCover: String(payload?.homeCover || payload?.home_cover || ''),
    moduleCovers: normalizeModuleCovers(payload?.moduleCovers || payload?.module_covers),
    updatedAt: payload?.updatedAt || payload?.updated_at || '',
  }
}

function toCloudRow(roomCode, roomData, updatedAt = new Date().toISOString()) {
  return {
    room_code: roomCode,
    selected_date: roomData.selectedDate,
    diary_entries: roomData.savedDiaryEntries,
    love_logs: roomData.loveLogs,
    map_cities: roomData.mapCities,
    home_cover: roomData.homeCover || '',
    module_covers: normalizeModuleCovers(roomData.moduleCovers),
    updated_at: updatedAt,
  }
}

function toLocalStorageKey(roomCode) {
  return `${ROOM_LOCAL_PREFIX}-${encodeURIComponent(roomCode)}`
}

function readLocalRoom(roomCode) {
  try {
    const raw = localStorage.getItem(toLocalStorageKey(roomCode))
    if (!raw) return getDefaultRoomData()
    return normalizeRoomData(JSON.parse(raw))
  } catch {
    return getDefaultRoomData()
  }
}

function writeLocalRoom(roomCode, roomData) {
  localStorage.setItem(toLocalStorageKey(roomCode), JSON.stringify(roomData))
}

function normalizeMatchCode(text) {
  return String(text || '').trim()
}

function resolveRoomCode(user) {
  const matchCode = normalizeMatchCode(user?.matchCode)
  if (matchCode) return `pair:${matchCode}`
  return `user:${user?.id || user?.username || 'default'}`
}

async function fetchCloudRoom(roomCode) {
  if (!supabase) return getDefaultRoomData()

  const { data, error } = await supabase
    .from(ROOM_TABLE)
    .select('*')
    .eq('room_code', roomCode)
    .maybeSingle()

  if (error) throw error

  if (data) return normalizeRoomData(data)

  const base = getDefaultRoomData()
  const now = new Date().toISOString()
  const { error: upsertError } = await supabase
    .from(ROOM_TABLE)
    .upsert(toCloudRow(roomCode, base, now), { onConflict: 'room_code' })
  if (upsertError) throw upsertError
  return { ...base, updatedAt: now }
}

const LoveStoryContext = createContext(null)

export function LoveStoryProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const roomCode = useMemo(() => resolveRoomCode(user), [user])

  const [selectedDate, setSelectedDateState] = useState(() => forceDiaryStartYear(formatDate(new Date())))
  const [savedDiaryEntries, setSavedDiaryEntries] = useState([])
  const [loveLogs, setLoveLogs] = useState(() => normalizeLoveLogs(DEFAULT_LOVE_LOGS))
  const [mapCities, setMapCities] = useState(() => normalizeMapCities(DEFAULT_CITIES))
  const [homeCover, setHomeCoverState] = useState('')
  const [moduleCovers, setModuleCoversState] = useState({ diary: '', love: '', map: '' })
  const [isRoomReady, setIsRoomReady] = useState(false)
  const [isRoomSyncing, setIsRoomSyncing] = useState(false)
  const [roomSyncError, setRoomSyncError] = useState('')

  const skipNextCloudWriteRef = useRef(false)
  const lastRemoteUpdatedAtRef = useRef('')

  useEffect(() => {
    let cancelled = false

    const hydrateRoom = async () => {
      setIsRoomReady(false)
      setRoomSyncError('')

      if (IS_CLOUD_MODE && supabase && isAuthenticated) {
        setIsRoomSyncing(true)
        try {
          const remote = await fetchCloudRoom(roomCode)
          if (cancelled) return
          skipNextCloudWriteRef.current = true
          lastRemoteUpdatedAtRef.current = remote.updatedAt || ''
          setSelectedDateState(remote.selectedDate)
          setSavedDiaryEntries(remote.savedDiaryEntries)
          setLoveLogs(remote.loveLogs)
          setMapCities(remote.mapCities)
          setHomeCoverState(remote.homeCover)
          setModuleCoversState(remote.moduleCovers)
        } catch {
          if (cancelled) return
          const local = readLocalRoom(roomCode)
          setSelectedDateState(local.selectedDate)
          setSavedDiaryEntries(local.savedDiaryEntries)
          setLoveLogs(local.loveLogs)
          setMapCities(local.mapCities)
          setHomeCoverState(local.homeCover)
          setModuleCoversState(local.moduleCovers)
          setRoomSyncError('共享空间加载失败，已回退本地数据。')
        } finally {
          if (!cancelled) setIsRoomSyncing(false)
        }
      } else {
        const local = readLocalRoom(roomCode)
        setSelectedDateState(local.selectedDate)
        setSavedDiaryEntries(local.savedDiaryEntries)
        setLoveLogs(local.loveLogs)
        setMapCities(local.mapCities)
        setHomeCoverState(local.homeCover)
        setModuleCoversState(local.moduleCovers)
      }

      if (!cancelled) setIsRoomReady(true)
    }

    hydrateRoom()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, roomCode])

  useEffect(() => {
    if (!isRoomReady) return
    if (IS_CLOUD_MODE && supabase && isAuthenticated) return
    writeLocalRoom(roomCode, {
      selectedDate,
      savedDiaryEntries,
      loveLogs,
      mapCities,
      homeCover,
      moduleCovers,
      updatedAt: new Date().toISOString(),
    })
  }, [
    homeCover,
    isAuthenticated,
    isRoomReady,
    loveLogs,
    mapCities,
    moduleCovers,
    roomCode,
    savedDiaryEntries,
    selectedDate,
  ])

  useEffect(() => {
    if (!isRoomReady) return undefined
    if (!IS_CLOUD_MODE || !supabase || !isAuthenticated) return undefined

    if (skipNextCloudWriteRef.current) {
      skipNextCloudWriteRef.current = false
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setIsRoomSyncing(true)
      const now = new Date().toISOString()
      const { error } = await supabase
        .from(ROOM_TABLE)
        .upsert(
          toCloudRow(
            roomCode,
            {
              selectedDate,
              savedDiaryEntries,
              loveLogs,
              mapCities,
              homeCover,
              moduleCovers,
            },
            now,
          ),
          { onConflict: 'room_code' },
        )

      if (error) {
        setRoomSyncError('共享空间同步失败，请稍后重试。')
      } else {
        setRoomSyncError('')
        lastRemoteUpdatedAtRef.current = now
      }
      setIsRoomSyncing(false)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    homeCover,
    isAuthenticated,
    isRoomReady,
    loveLogs,
    mapCities,
    moduleCovers,
    roomCode,
    savedDiaryEntries,
    selectedDate,
  ])

  useEffect(() => {
    if (!isRoomReady) return undefined
    if (!IS_CLOUD_MODE || !supabase || !isAuthenticated) return undefined

    let stopped = false
    const poll = async () => {
      const { data, error } = await supabase
        .from(ROOM_TABLE)
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle()
      if (stopped || error || !data) return

      const remote = normalizeRoomData(data)
      if (remote.updatedAt && remote.updatedAt === lastRemoteUpdatedAtRef.current) return

      lastRemoteUpdatedAtRef.current = remote.updatedAt || ''
      skipNextCloudWriteRef.current = true
      setSelectedDateState(remote.selectedDate)
      setSavedDiaryEntries(remote.savedDiaryEntries)
      setLoveLogs(remote.loveLogs)
      setMapCities(remote.mapCities)
      setHomeCoverState(remote.homeCover)
      setModuleCoversState(remote.moduleCovers)
    }

    const timer = window.setInterval(poll, 3200)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [isAuthenticated, isRoomReady, roomCode])

  const setSelectedDate = useCallback((nextDateText) => {
    setSelectedDateState(forceDiaryStartYear(nextDateText))
  }, [])

  const setHomeCover = useCallback((nextCover) => {
    setHomeCoverState(String(nextCover || ''))
  }, [])

  const setModuleCover = useCallback((moduleKey, nextCover) => {
    if (!['diary', 'love', 'map'].includes(moduleKey)) return
    setModuleCoversState((prev) => ({
      ...prev,
      [moduleKey]: String(nextCover || ''),
    }))
  }, [])

  const diaryEntries = useMemo(() => {
    const base = buildFiveYears(selectedDate)
    return base.map((entry) => {
      const matched = savedDiaryEntries.find((item) => item.id === entry.id)
      return matched ? matched : entry
    })
  }, [savedDiaryEntries, selectedDate])

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
    homeCover,
    setHomeCover,
    moduleCovers,
    setModuleCover,
    syncMode: IS_CLOUD_MODE ? 'cloud' : 'local',
    syncGroup: user?.matchCode ? String(user.matchCode).trim() : '',
    isRoomSyncing,
    roomSyncError,
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
