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

  useEffect(() => {
    if (!isPlaying || photos.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % photos.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [isPlaying, photos.length])

  if (!city) return null

  const safeActiveIndex = photos.length > 0 ? Math.min(activeIndex, photos.length - 1) : 0

  const showPrev = () => {
    if (photos.length < 2) return
    setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const showNext = () => {
    if (photos.length < 2) return
    setActiveIndex((prev) => (prev + 1) % photos.length)
  }

  const getStackClass = (index) => {
    if (index === safeActiveIndex) return 'is-current'
    if (index === (safeActiveIndex + 1) % photos.length) return 'is-next'
    if (index === (safeActiveIndex - 1 + photos.length) % photos.length) return 'is-prev'
    return 'is-hidden'
  }

  const deleteCurrentPhoto = () => {
    if (!photos.length) return
    const currentPhoto = photos[safeActiveIndex]
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
            <div className="photo-stack" aria-label={`${cityName} 照片堆叠展示`}>
              {photos.map((photo, index) => (
                <img
                  key={`${city.id}-${photo.id || index}`}
                  className={`photo-stack__item ${getStackClass(index)}`}
                  src={photo.url}
                  alt={`${cityName} 照片 ${index + 1}`}
                />
              ))}
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
  const { mapCities, addCity, deleteCity, deleteCityPhoto } = useLoveStory()
  const chartRef = useRef(null)
  const instanceRef = useRef(null)
  const uploadRef = useRef(null)
  const loadedMapsRef = useRef(new Set(['china']))

  const [form, setForm] = useState({
    city: '',
    visitedAt: formatDate(new Date()),
    photos: [],
  })
  const [selectedCityId, setSelectedCityId] = useState('')
  const [formError, setFormError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [mapState, setMapState] = useState({
    mapKey: 'china',
    title: '全国行政区划',
    level: 'country',
    regionFilter: '',
  })
  const mapStateRef = useRef(mapState)

  useEffect(() => {
    mapStateRef.current = mapState
  }, [mapState])

  const selectedCity = useMemo(
    () => mapCities.find((item) => item.id === selectedCityId) || null,
    [mapCities, selectedCityId],
  )

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
          } catch {
            return
          }
        }

        setMapState({
          mapKey,
          title: provinceName,
          level: 'province',
          regionFilter: '',
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
      ],
    })
  }, [mapState, visibleCitySeriesData, visiblePhotoSeriesData])

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

  const handleSubmit = (event) => {
    event.preventDefault()

    const result = addCity(form)
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

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">旅行地图</p>
          <h2>{mapState.regionFilter ? `${mapState.title} · ${mapState.regionFilter}` : mapState.title}</h2>
        </div>
        {mapState.level === 'province' ? (
          <div className="row-actions">
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
                })
              }
            >
              返回全国
            </button>
          </div>
        ) : null}
      </div>

      <form className="city-form" onSubmit={handleSubmit}>
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

        <button className="primary" type="submit" disabled={isRecognizing}>
          点亮城市
        </button>
        {formError ? <p className="form-error">{formError}</p> : null}
      </form>

      <div className="map-wrap">
        <div
          ref={chartRef}
          className="map-chart"
          role="img"
          aria-label={mapState.level === 'country' ? '中国地图' : `${mapState.title}行政区划地图`}
        />

        <div className="city-list">
          {mapCities.map((city) => (
            <div className="city-item" key={`${city.id}-item`}>
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
