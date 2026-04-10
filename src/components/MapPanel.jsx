import { useEffect, useMemo, useRef, useState } from 'react'
import exifr from 'exifr'
import { EffectScatterChart, MapChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { init, registerMap, use as echartsUse } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import chinaJson from '../assets/china.json'
import { useLoveStory } from '../context/LoveStoryContext'
import { formatDate } from '../lib/date'

const PROVINCE_MAP_FILES = {
  北京市: 'beijing',
  天津市: 'tianjin',
  上海市: 'shanghai',
  重庆市: 'chongqing',
  河北省: 'hebei',
  山西省: 'shanxi',
  辽宁省: 'liaoning',
  吉林省: 'jilin',
  黑龙江省: 'heilongjiang',
  江苏省: 'jiangsu',
  浙江省: 'zhejiang',
  安徽省: 'anhui',
  福建省: 'fujian',
  江西省: 'jiangxi',
  山东省: 'shandong',
  河南省: 'henan',
  湖北省: 'hubei',
  湖南省: 'hunan',
  广东省: 'guangdong',
  海南省: 'hainan',
  四川省: 'sichuan',
  贵州省: 'guizhou',
  云南省: 'yunnan',
  陕西省: 'shaanxi',
  甘肃省: 'gansu',
  青海省: 'qinghai',
  台湾省: 'taiwan',
  内蒙古自治区: 'neimenggu',
  广西壮族自治区: 'guangxi',
  西藏自治区: 'xizang',
  宁夏回族自治区: 'ningxia',
  新疆维吾尔自治区: 'xinjiang',
  香港特别行政区: 'xianggang',
  澳门特别行政区: 'aomen',
}

function toProvinceName(name) {
  if (!name) return ''
  if (PROVINCE_MAP_FILES[name]) return name
  if (name.endsWith('省')) return name
  if (name.endsWith('市')) return name
  if (name.endsWith('自治区') || name.endsWith('特别行政区')) return name

  if (name === '内蒙古') return '内蒙古自治区'
  if (name === '广西') return '广西壮族自治区'
  if (name === '西藏') return '西藏自治区'
  if (name === '宁夏') return '宁夏回族自治区'
  if (name === '新疆') return '新疆维吾尔自治区'
  if (name === '香港') return '香港特别行政区'
  if (name === '澳门') return '澳门特别行政区'

  if (PROVINCE_MAP_FILES[`${name}省`]) return `${name}省`
  if (PROVINCE_MAP_FILES[`${name}市`]) return `${name}市`
  return name
}

function sameRegion(a, b) {
  const left = String(a || '').trim()
  const right = String(b || '').trim()
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

function formatPhotoTime(isoText) {
  if (!isoText) return ''
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', { hour12: false })
}

function extractRegionLabels(geoJson) {
  const features = Array.isArray(geoJson?.features) ? geoJson.features : []
  return features
    .map((feature) => {
      const name = feature?.properties?.name || feature?.name || ''
      const cp = feature?.properties?.cp || feature?.cp || []
      const [lng, lat] = Array.isArray(cp) ? cp : []
      if (!name || !Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return null
      return {
        name,
        value: [Number(lng), Number(lat)],
      }
    })
    .filter(Boolean)
}

function hasVisitedMatch(regionName, city) {
  if (!city) return false

  if (sameRegion(regionName, city.city) || sameRegion(regionName, city.district)) {
    return true
  }

  const photos = Array.isArray(city.photos) ? city.photos : []
  return photos.some((photo) => {
    const admin = photo?.admin || {}
    return sameRegion(regionName, admin.district) || sameRegion(regionName, admin.city)
  })
}

function normalizeCountryRegionName(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  if (PROVINCE_MAP_FILES[text]) return text
  if (PROVINCE_MAP_FILES[`${text}省`]) return `${text}省`
  if (PROVINCE_MAP_FILES[`${text}市`]) return `${text}市`
  if (text === '内蒙古') return '内蒙古自治区'
  if (text === '广西') return '广西壮族自治区'
  if (text === '西藏') return '西藏自治区'
  if (text === '宁夏') return '宁夏回族自治区'
  if (text === '新疆') return '新疆维吾尔自治区'
  if (text === '香港') return '香港特别行政区'
  if (text === '澳门') return '澳门特别行政区'
  if (text === '台湾') return '台湾省'
  return text
}

function toTimeValue(value) {
  const time = new Date(value || '').getTime()
  return Number.isFinite(time) ? time : 0
}

function makePhotoId(index) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
  return `photo-${index}-${random}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=zh-CN`
    const response = await fetch(url)
    if (!response.ok) return null
    const json = await response.json()
    const address = json?.address || {}

    const province = toProvinceName(address.state || address.province || '')
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district ||
      ''
    const district =
      address.city_district || address.suburb || address.county || address.city || ''

    return {
      province,
      city,
      district,
    }
  } catch {
    return null
  }
}

async function parsePhotoFile(file, index) {
  const url = await fileToDataUrl(file)
  let lat = null
  let lng = null
  let takenAt = ''
  let admin = null

  try {
    const meta = await exifr.parse(file, {
      gps: true,
      ifd0: true,
      exif: true,
      tiff: true,
    })

    lat = Number.isFinite(meta?.latitude) ? meta.latitude : null
    lng = Number.isFinite(meta?.longitude) ? meta.longitude : null

    if (meta?.DateTimeOriginal) {
      takenAt = new Date(meta.DateTimeOriginal).toISOString()
    }

    if (lat !== null && lng !== null) {
      admin = await reverseGeocode(lat, lng)
    }
  } catch {
    // ignore parsing failure and fallback to plain image upload
  }

  return {
    id: makePhotoId(index),
    url,
    lat,
    lng,
    takenAt,
    admin,
  }
}

let mapRegistered = false

echartsUse([GeoComponent, TooltipComponent, MapChart, EffectScatterChart, CanvasRenderer])

if (!mapRegistered) {
  registerMap('china', chinaJson)
  mapRegistered = true
}

function CityModal({ city, onClose, onDeletePhoto }) {
  const photos = Array.isArray(city?.photos) ? city.photos : []
  const cityName = city?.city || '城市'

  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [turnDirection, setTurnDirection] = useState('')
  const [isTurning, setIsTurning] = useState(false)

  useEffect(() => {
    if (!isPlaying || photos.length < 2) return undefined
    const timer = window.setInterval(() => {
      if (isTurning) return
      setTurnDirection('next')
      setIsTurning(true)
      window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % photos.length)
        setIsTurning(false)
        setTurnDirection('')
      }, 420)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [isPlaying, isTurning, photos.length])

  if (!city) return null

  const safeActiveIndex = photos.length > 0 ? Math.min(activeIndex, photos.length - 1) : 0
  const prevIndex = photos.length > 1 ? (safeActiveIndex - 1 + photos.length) % photos.length : 0
  const nextIndex = photos.length > 1 ? (safeActiveIndex + 1) % photos.length : 0
  const turningTargetIndex = turnDirection === 'prev' ? prevIndex : nextIndex
  const currentPhoto = photos[safeActiveIndex]
  const turningTargetPhoto = photos[turningTargetIndex]

  const runFlip = (direction) => {
    if (photos.length < 2 || isTurning) return

    setTurnDirection(direction)
    setIsTurning(true)

    window.setTimeout(() => {
      setActiveIndex((prev) =>
        direction === 'prev'
          ? (prev - 1 + photos.length) % photos.length
          : (prev + 1) % photos.length,
      )
      setIsTurning(false)
      setTurnDirection('')
    }, 420)
  }

  const showPrev = () => {
    runFlip('prev')
  }

  const showNext = () => {
    runFlip('next')
  }

  const deleteCurrentPhoto = () => {
    if (!photos.length) return
    onDeletePhoto?.(city, currentPhoto, safeActiveIndex)
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`${cityName} 照片墙`}>
      <div className="modal__mask" onClick={onClose}></div>
      <div className="modal__card modal__card--gallery">
        <button className="modal__close ghost" type="button" onClick={onClose}>
          关闭
        </button>

        {photos.length === 0 ? <p className="empty-note">这个城市还没有上传照片。</p> : null}

        {photos.length === 1 ? (
          <div className="photo-player">
            <div className="photo-stage">
              <img src={photos[0].url} alt={`${cityName} 照片 1`} />
            </div>
            <div className="photo-player__controls">
              <button className="ghost danger" type="button" onClick={deleteCurrentPhoto}>
                删除当前图片
              </button>
            </div>
          </div>
        ) : null}

        {photos.length > 1 ? (
          <div className="photo-player">
            <div className="photo-book" aria-label={`${cityName} 照片翻页展示`}>
              <div className="photo-book__shadow" aria-hidden="true"></div>
              <div className="photo-book__sheet">
                {turningTargetPhoto ? (
                  <img
                    className={`photo-book__page photo-book__page--under photo-book__page--under-${turnDirection || 'next'}`}
                    src={turningTargetPhoto.url}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
                {currentPhoto ? (
                  <img
                    key={`${city.id}-${currentPhoto.id || safeActiveIndex}-${turnDirection || 'rest'}`}
                    className={`photo-book__page photo-book__page--current${isTurning ? ` is-turning-${turnDirection}` : ''}`}
                    src={currentPhoto.url}
                    alt={`${cityName} 照片 ${safeActiveIndex + 1}`}
                  />
                ) : null}
              </div>
            </div>
            <div className="photo-player__controls">
              <button className="ghost" type="button" onClick={showPrev}>
                上一张
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
              >
                {isPlaying ? '暂停播放' : '开始播放'}
              </button>
              <button className="ghost" type="button" onClick={showNext}>
                下一张
              </button>
              <button className="ghost danger" type="button" onClick={deleteCurrentPhoto}>
                删除当前图片
              </button>
            </div>
            <p className="photo-player__status">
              {safeActiveIndex + 1} / {photos.length}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MapPanel() {
  const {
    mapCities,
    addCity,
    deleteCity,
    deleteCityPhoto,
    futureTrips,
    addFutureTrip,
    deleteFutureTrip,
  } = useLoveStory()
  const chartRef = useRef(null)
  const instanceRef = useRef(null)
  const uploadRef = useRef(null)
  const loadedMapsRef = useRef(new Set(['china']))
  const regionLabelsCacheRef = useRef(new Map())

  const [form, setForm] = useState({
    city: '',
    visitedAt: formatDate(new Date()),
    photos: [],
  })
  const [selectedCityId, setSelectedCityId] = useState('')
  const [formError, setFormError] = useState('')
  const [futureTripForm, setFutureTripForm] = useState({ name: '' })
  const [isDragging, setIsDragging] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [mapState, setMapState] = useState({
    mapKey: 'china',
    title: '全国行政区划',
    level: 'country',
    regionFilter: '',
    regionLabels: [],
  })
  const mapStateRef = useRef(mapState)

  useEffect(() => {
    mapStateRef.current = mapState
  }, [mapState])

  const selectedCity = useMemo(
    () => mapCities.find((item) => item.id === selectedCityId) || null,
    [mapCities, selectedCityId],
  )

  const recentCities = useMemo(
    () => [...mapCities].sort((a, b) => toTimeValue(b.visitedAt) - toTimeValue(a.visitedAt)),
    [mapCities],
  )

  const photoMoments = useMemo(
    () =>
      mapCities
        .flatMap((city) =>
          (Array.isArray(city.photos) ? city.photos : []).map((photo, index) => ({
            id: photo.id || `${city.id}-${index}`,
            url: photo.url,
            cityId: city.id,
            city: city.city,
            province: city.province || '',
            visitedAt: city.visitedAt,
            takenAt: photo.takenAt || '',
            sortTime: toTimeValue(photo.takenAt || city.visitedAt),
          })),
        )
        .filter((item) => item.url)
        .sort((a, b) => b.sortTime - a.sortTime),
    [mapCities],
  )

  const highlightedCity = selectedCity || recentCities[0] || null
  const recentSnapshots = photoMoments.slice(0, 3)
  const provinceCount = new Set(mapCities.map((city) => city.province).filter(Boolean)).size
  const totalPhotoCount = photoMoments.length

  const seriesData = useMemo(
    () =>
      mapCities.map((city) => ({
        id: city.id,
        kind: 'city',
        cityId: city.id,
        name: city.city,
        province: city.province || '',
        district: city.district || '',
        visitedAt: city.visitedAt,
        value: [city.lng, city.lat],
      })),
    [mapCities],
  )

  const photoSeriesData = useMemo(
    () =>
      mapCities.flatMap((city) =>
        (Array.isArray(city.photos) ? city.photos : [])
          .map((photo, index) => {
            const hasPhotoCoord = Number.isFinite(photo?.lng) && Number.isFinite(photo?.lat)
            const fallbackLng = Number.isFinite(city?.lng) ? Number(city.lng) : null
            const fallbackLat = Number.isFinite(city?.lat) ? Number(city.lat) : null
            if (!hasPhotoCoord && (fallbackLng === null || fallbackLat === null)) {
              return null
            }

            const lng = hasPhotoCoord ? Number(photo.lng) : fallbackLng
            const lat = hasPhotoCoord ? Number(photo.lat) : fallbackLat
            // fallback to city coordinate with a tiny spread so multiple photos can be seen.
            const spread = hasPhotoCoord ? 0 : (index % 5) * 0.06

            return {
              id: `${city.id}-${photo.id || index}`,
              kind: 'photo',
              cityId: city.id,
              name: photo?.admin?.district || city.district || city.city,
              city: city.city,
              province: photo?.admin?.province || city.province || '',
              district: photo?.admin?.district || city.district || '',
              visitedAt: city.visitedAt,
              takenAt: photo.takenAt || '',
              locationSource: hasPhotoCoord ? 'exif' : 'city',
              value: [Number(lng) + spread, Number(lat) + spread],
            }
          })
          .filter(Boolean),
      ),
    [mapCities],
  )

  const visibleCitySeriesData = useMemo(() => {
    if (mapState.level !== 'province') return seriesData

    const scoped = seriesData.filter(
      (item) => toProvinceName(item.province || '') === toProvinceName(mapState.title),
    )

    if (!mapState.regionFilter) return scoped

    return scoped.filter(
      (item) =>
        sameRegion(item.district, mapState.regionFilter) ||
        sameRegion(item.name, mapState.regionFilter),
    )
  }, [seriesData, mapState.level, mapState.title, mapState.regionFilter])

  const visiblePhotoSeriesData = useMemo(() => {
    if (mapState.level !== 'province') return photoSeriesData

    const scoped = photoSeriesData.filter(
      (item) => toProvinceName(item.province || '') === toProvinceName(mapState.title),
    )

    if (!mapState.regionFilter) return scoped

    return scoped.filter(
      (item) =>
        sameRegion(item.district, mapState.regionFilter) ||
        sameRegion(item.city, mapState.regionFilter),
      )
  }, [photoSeriesData, mapState.level, mapState.title, mapState.regionFilter])

  const visibleRegionLabels = useMemo(() => {
    const labels = Array.isArray(mapState.regionLabels) ? mapState.regionLabels : []
    if (mapState.level !== 'province') return []
    if (!mapState.regionFilter) return labels
    return labels.filter((item) => sameRegion(item.name, mapState.regionFilter))
  }, [mapState.level, mapState.regionFilter, mapState.regionLabels])

  const visitedGeoRegions = useMemo(() => {
    if (mapState.level === 'country') {
      const provinceNames = [
        ...new Set(mapCities.map((city) => normalizeCountryRegionName(city.province || '')).filter(Boolean)),
      ]
      return provinceNames.map((name) => ({
        name,
        itemStyle: {
          areaColor: '#dfb5bd',
          borderColor: '#ab7b84',
          borderWidth: 1.2,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#d2a0a9',
          },
        },
      }))
    }

    if (mapState.level === 'province') {
      const inProvince = mapCities.filter(
        (city) => toProvinceName(city.province || '') === toProvinceName(mapState.title),
      )

      return visibleRegionLabels
        .filter((label) => inProvince.some((city) => hasVisitedMatch(label.name, city)))
        .map((label) => ({
          name: label.name,
          itemStyle: {
            areaColor: '#dfb5bd',
            borderColor: '#ab7b84',
            borderWidth: 1.1,
          },
          emphasis: {
            itemStyle: {
              areaColor: '#d29fa8',
            },
          },
        }))
    }

    return []
  }, [mapCities, mapState.level, mapState.title, visibleRegionLabels])

  useEffect(() => {
    if (!chartRef.current) return

    const chart = init(chartRef.current)
    instanceRef.current = chart

    chart.on('click', async (params) => {
      const pointKind = params?.data?.kind
      const cityId = params?.data?.cityId || params?.data?.id
      if (cityId) {
        setSelectedCityId(cityId)
        return
      }

      const clickedName = params?.name || ''
      if (!clickedName || pointKind) return

      const currentState = mapStateRef.current
      if (currentState.level === 'country') {
        const provinceName = toProvinceName(clickedName)
        const slug = PROVINCE_MAP_FILES[provinceName]
        if (!slug) return

        const mapKey = `province-${slug}`
        if (!loadedMapsRef.current.has(mapKey)) {
          try {
            const response = await fetch(
              `https://fastly.jsdelivr.net/npm/echarts/map/json/province/${slug}.json`,
            )
            if (!response.ok) return
            const json = await response.json()
            registerMap(mapKey, json)
            loadedMapsRef.current.add(mapKey)
            const nextLabels = extractRegionLabels(json)
            regionLabelsCacheRef.current.set(mapKey, nextLabels)
            setMapState({
              mapKey,
              title: provinceName,
              level: 'province',
              regionFilter: '',
              regionLabels: nextLabels,
            })
            return
          } catch {
            return
          }
        }

        setMapState({
          mapKey,
          title: provinceName,
          level: 'province',
          regionFilter: '',
          regionLabels:
            regionLabelsCacheRef.current.get(mapKey) ||
            (currentState.mapKey === mapKey ? currentState.regionLabels : []),
        })
        return
      }

      if (currentState.level === 'province') {
        setMapState((prev) =>
          prev.level !== 'province'
            ? prev
            : {
                ...prev,
                regionFilter: prev.regionFilter === clickedName ? '' : clickedName,
              },
        )
      }
    })

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
      instanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = instanceRef.current
    if (!chart) return

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.seriesType === 'map') return params.name
          if (!params.data) return params.name
          if (params.data.kind === 'photo') {
            return [
              `照片定位：${params.data.city}`,
              params.data.district ? `行政区：${params.data.district}` : '',
              `到访日期：${params.data.visitedAt}`,
              params.data.takenAt ? `拍摄时间：${formatPhotoTime(params.data.takenAt)}` : '',
              params.data.locationSource === 'exif' ? '坐标来源：照片GPS' : '坐标来源：城市定位',
            ]
              .filter(Boolean)
              .join('<br/>')
          }
          return `${params.name}<br/>到访日期：${params.data.visitedAt}`
        },
      },
      geo: {
        map: mapState.mapKey,
        roam: true,
        zoom: mapState.level === 'country' ? 1.18 : 1.2,
        scaleLimit: {
          min: 1,
          max: 25,
        },
        label: {
          show: true,
          color: '#6f5259',
          fontSize: mapState.level === 'country' ? 9 : 10,
        },
        regions: visitedGeoRegions,
        labelLayout: {
          hideOverlap: false,
        },
        itemStyle: {
          areaColor: '#f4e8ea',
          borderColor: '#b88f96',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#ead7db',
          },
          label: {
            show: true,
          },
        },
      },
      series: [
        {
          type: 'map',
          map: mapState.mapKey,
          geoIndex: 0,
          data: [],
          silent: false,
          itemStyle: {
            areaColor: 'transparent',
            borderColor: 'transparent',
          },
          emphasis: {
            label: {
              show: true,
            },
          },
          labelLayout: {
            hideOverlap: false,
          },
        },
        {
          type: 'effectScatter',
          name: '旅行城市',
          coordinateSystem: 'geo',
          data: visibleCitySeriesData,
          symbolSize: 11,
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 3,
          },
          itemStyle: {
            color: '#b78a92',
            shadowBlur: 12,
            shadowColor: 'rgba(159, 114, 122, 0.65)',
          },
          label: {
            show: true,
            formatter: '{b}',
            position: 'right',
            color: '#6f5259',
            fontSize: 11,
          },
        },
        {
          type: 'scatter',
          name: '照片定位',
          coordinateSystem: 'geo',
          data: visiblePhotoSeriesData,
          symbolSize: 10,
          itemStyle: {
            color: '#fff4f6',
            borderColor: '#9f727a',
            borderWidth: 1.3,
            shadowBlur: 9,
            shadowColor: 'rgba(159, 114, 122, 0.55)',
          },
          label: {
            show: false,
          },
          emphasis: {
            scale: 1.2,
          },
          zlevel: 3,
        },
        {
          type: 'scatter',
          name: '行政区划标签',
          coordinateSystem: 'geo',
          data: visibleRegionLabels,
          symbolSize: 1,
          silent: true,
          itemStyle: {
            color: 'transparent',
            opacity: 0,
          },
          label: {
            show: mapState.level === 'province',
            formatter: '{b}',
            position: 'inside',
            color: '#6b4e56',
            fontSize: 10,
            fontWeight: 700,
            backgroundColor: 'rgba(255, 248, 249, 0.74)',
            borderRadius: 999,
            padding: [3, 8],
          },
          labelLayout: {
            hideOverlap: false,
          },
          zlevel: 2,
        },
      ],
    })
  }, [mapState, visibleCitySeriesData, visiblePhotoSeriesData, visibleRegionLabels, visitedGeoRegions])

  const appendPhotos = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return

    setIsRecognizing(true)
    try {
      const parsedPhotos = []
      for (let i = 0; i < files.length; i += 1) {
        const parsed = await parsePhotoFile(files[i], i)
        parsedPhotos.push(parsed)
      }

      setForm((prev) => {
        const autoAdmin = parsedPhotos.find((item) => item.admin)?.admin
        return {
          ...prev,
          city: prev.city || autoAdmin?.city || autoAdmin?.province || '',
          photos: [...prev.photos, ...parsedPhotos],
        }
      })
    } finally {
      setIsRecognizing(false)
    }
  }

  const handlePhotoChange = async (event) => {
    try {
      await appendPhotos(event.target.files)
    } finally {
      event.target.value = ''
    }
  }

  const handlePhotoDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    await appendPhotos(event.dataTransfer.files)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const result = await addCity(form)
    if (!result.ok) {
      setFormError(result.message || '请输入正确的城市信息。')
      return
    }

    setFormError('')
    setSelectedCityId(result.cityId)
    setForm({
      city: '',
      visitedAt: formatDate(new Date()),
      photos: [],
    })
  }

  const handleDeleteCity = (city) => {
    const shouldDelete = window.confirm(`确定删除 ${city.city} 的旅行记录和全部照片吗？`)
    if (!shouldDelete) return
    deleteCity(city.id)
    setSelectedCityId((prev) => (prev === city.id ? '' : prev))
  }

  const handleDeleteCityPhoto = (city, photo, index) => {
    const shouldDelete = window.confirm('确定只删除这一张图片吗？')
    if (!shouldDelete) return
    deleteCityPhoto(city.id, photo?.id, index)
  }

  const handleFocusCity = (cityId) => {
    setSelectedCityId(cityId)
  }

  const handleAddFutureTrip = (event) => {
    event.preventDefault()
    const ok = addFutureTrip(futureTripForm)
    if (!ok) return
    setFutureTripForm({ name: '' })
  }

  return (
    <section className="panel map-panel">
      <div className="map-stage">
        <div className="map-stage__main">
          <header className="map-stage__header">
            <div>
              <p className="panel__eyebrow">旅行地图</p>
              <h2>
                {mapState.regionFilter ? `${mapState.title} · ${mapState.regionFilter}` : mapState.title}
              </h2>
              <p className="map-stage__subtitle">把共同去过的地方，整理成一张会发光的地图。</p>
            </div>
            <div className="map-stage__chips">
              <span>{mapCities.length} 座城市</span>
              <span>{provinceCount} 个省级区域</span>
              <span>{totalPhotoCount} 张照片</span>
            </div>
          </header>

          <div className="map-wrap map-wrap--spotlight">
            <div className="map-scene">
              <div
                ref={chartRef}
                className="map-chart map-chart--spotlight"
                role="img"
                aria-label={mapState.level === 'country' ? '中国地图' : `${mapState.title}行政区划地图`}
              />

              <div className="map-scene__controls">
                {mapState.level === 'province' ? (
                  <>
                    {mapState.regionFilter ? (
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => setMapState((prev) => ({ ...prev, regionFilter: '' }))}
                      >
                        清除区县筛选
                      </button>
                    ) : null}
                    <button
                      className="ghost"
                      type="button"
                      onClick={() =>
                    setMapState({
                      mapKey: 'china',
                      title: '全国行政区划',
                      level: 'country',
                      regionFilter: '',
                      regionLabels: [],
                    })
                  }
                >
                      返回全国
                    </button>
                  </>
                ) : (
                  <button className="ghost" type="button" onClick={() => uploadRef.current?.click()}>
                    上传图片
                  </button>
                )}
              </div>
            </div>

            <div className="map-stats-grid">
              <article className="map-stat-card">
                <span>已点亮城市</span>
                <strong>{mapCities.length}</strong>
                <em>旅行足迹持续扩展中</em>
              </article>
              <article className="map-stat-card">
                <span>收录照片</span>
                <strong>{totalPhotoCount}</strong>
                <em>支持定位到具体行政区</em>
              </article>
              <article className="map-stat-card">
                <span>当前焦点</span>
                <strong>{highlightedCity?.city || '等待点亮'}</strong>
                <em>{highlightedCity?.visitedAt || '添加后自动更新'}</em>
              </article>
            </div>
          </div>

          <form className="city-form city-form--map" onSubmit={handleSubmit}>
            <div className="city-form__head">
              <div>
                <h3>点亮新的旅行章节</h3>
                <p>上传照片后会尝试读取 GPS，并自动匹配行政区划。</p>
              </div>
            </div>

            <div className="city-form__row">
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                placeholder="城市名（可留空，自动识别）"
              />
              <input
                type="date"
                value={form.visitedAt}
                onChange={(event) => setForm({ ...form, visitedAt: event.target.value })}
              />
            </div>

            <div
              className={`upload-dropzone${isDragging ? ' upload-dropzone--active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handlePhotoDrop}
            >
              <p>拖拽旅行图片到这里，或点击上传文件（会尝试识别行政区划）</p>
              <button className="ghost" type="button" onClick={() => uploadRef.current?.click()}>
                上传图片
              </button>
              <input
                ref={uploadRef}
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
              />
            </div>

            {isRecognizing ? <p className="form-error">正在识别图片位置信息...</p> : null}

            {form.photos.length > 0 ? (
              <div className="upload-preview">
                {form.photos.map((photo, index) => (
                  <div key={photo.id || `${photo.url}-${index}`} className="upload-preview__item">
                    <img src={photo.url} alt={`旅行图片 ${index + 1}`} />
                    <button
                      className="ghost danger"
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          photos: prev.photos.filter((_, photoIndex) => photoIndex !== index),
                        }))
                      }
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="map-form__actions">
              <button className="primary" type="submit" disabled={isRecognizing}>
                点亮城市
              </button>
              {formError ? <p className="form-error">{formError}</p> : null}
            </div>
          </form>
        </div>

        <aside className="map-stage__side">
          <section className="map-photo-stack">
            <div className="map-photo-stack__head">
              <h3>最近快照</h3>
              <button
                className="ghost"
                type="button"
                onClick={() => (highlightedCity ? handleFocusCity(highlightedCity.id) : undefined)}
                disabled={!highlightedCity}
              >
                查看翻页相册
              </button>
            </div>

            <div className="snapshot-stack">
              {recentSnapshots.length ? (
                recentSnapshots.map((snapshot, index) => (
                  <button
                    key={snapshot.id}
                    type="button"
                    className={`snapshot-card snapshot-card--${index + 1}`}
                    onClick={() => handleFocusCity(snapshot.cityId)}
                  >
                    <div className="snapshot-card__image">
                      <img src={snapshot.url} alt={`${snapshot.city} 旅行照片`} />
                    </div>
                    <p>{snapshot.city}</p>
                  </button>
                ))
              ) : (
                <div className="snapshot-empty">
                  <p>上传旅行照片后，这里会自动生成最近快照。</p>
                </div>
              )}
            </div>

            <div className="snapshot-stack__actions">
              <button
                className="ghost"
                type="button"
                onClick={() => uploadRef.current?.click()}
              >
                添加照片
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => (recentCities[0] ? handleFocusCity(recentCities[0].id) : undefined)}
                disabled={!recentCities.length}
              >
                打开最新城市
              </button>
            </div>
          </section>

          <section className="journey-panel">
            <div className="journey-panel__head">
              <h3>旅行档案</h3>
              <span>{mapCities.length} 条记录</span>
            </div>

            <div className="city-list city-list--journey">
              {recentCities.map((city) => (
                <div className="city-item city-item--journey" key={`${city.id}-item`}>
                  <button
                    type="button"
                    className="city-item__open"
                    onClick={() => setSelectedCityId(city.id)}
                  >
                    <strong>{city.city}</strong>
                    <span>
                      {city.province ? `${city.province} · ` : ''}
                      {city.visitedAt}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="city-item__delete ghost danger"
                    onClick={() => handleDeleteCity(city)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="future-trip-panel">
            <div className="journey-panel__head">
              <h3>未来想去🌍</h3>
              <span>{futureTrips.length} 个愿望</span>
            </div>

            <form className="future-trip-form" onSubmit={handleAddFutureTrip}>
              <input
                value={futureTripForm.name}
                onChange={(event) =>
                  setFutureTripForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="输入未来想去的地方，比如冰岛、北海道、巴黎"
              />
              <button className="ghost" type="submit">
                添加愿望
              </button>
            </form>

            <div className="future-trip-list">
              {futureTrips.length ? (
                futureTrips.map((trip) => (
                  <div className="future-trip-item" key={trip.id}>
                    <div className="future-trip-item__main">
                      <strong>{trip.name}</strong>
                    </div>
                    <button
                      type="button"
                      className="city-item__delete ghost danger"
                      onClick={() => deleteFutureTrip(trip.id)}
                    >
                      删除
                    </button>
                  </div>
                ))
              ) : (
                <div className="future-trip-empty">
                  <p>把下一站想去的地方也悄悄放进来吧。</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <CityModal
        key={selectedCity?.id || 'no-city'}
        city={selectedCity}
        onClose={() => setSelectedCityId('')}
        onDeletePhoto={handleDeleteCityPhoto}
      />
    </section>
  )
}

export default MapPanel
