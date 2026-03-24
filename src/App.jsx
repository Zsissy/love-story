import { useRef } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth, AuthProvider } from './context/AuthContext'
import { LoveStoryProvider } from './context/LoveStoryContext'
import HomePage from './pages/HomePage'
import DiaryPage from './pages/DiaryPage'
import LovePage from './pages/LovePage'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import './App.css'

const baseNavItems = [
  { to: '/', label: '整合页', end: true },
  { to: '/diary', label: '五年日记' },
  { to: '/love', label: '恋爱记录' },
  { to: '/map', label: '旅行地图' },
]

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

function AppShell() {
  const {
    user,
    logout,
    isAdmin,
    updateCurrentUsername,
    updateCurrentPassword,
    updateCurrentAvatar,
  } = useAuth()
  const location = useLocation()
  const avatarUploadRef = useRef(null)
  const isHomePage = location.pathname === '/'
  const navItems = isAdmin
    ? [...baseNavItems, { to: '/me', label: '我的' }]
    : baseNavItems

  const handleRenameUsername = async () => {
    const nextUsername = window.prompt('请输入新用户名', user?.username || '')
    if (nextUsername === null) return

    const result = await updateCurrentUsername(nextUsername)
    window.alert(result.message || (result.ok ? '修改成功' : '修改失败'))
  }

  const handleChangePassword = async () => {
    const currentPassword = window.prompt('请输入当前密码')
    if (currentPassword === null) return
    const nextPassword = window.prompt('请输入新密码（至少 6 位）')
    if (nextPassword === null) return

    const result = await updateCurrentPassword(currentPassword, nextPassword)
    window.alert(result.message || (result.ok ? '修改成功' : '修改失败'))
  }

  const handleAvatarInput = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const avatar = await fileToDataUrl(file)
      const result = await updateCurrentAvatar(avatar)
      window.alert(result.message || (result.ok ? '修改成功' : '修改失败'))
    } catch {
      window.alert('头像读取失败，请重试。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className={`page${isHomePage ? ' page--home' : ''}`}>
      <header className={`hero${isHomePage ? ' hero--home' : ''}`}>
        <p className="eyebrow">Love Story</p>
        <h1 className="hero__title">z&z love story</h1>
        <p>
          五年日记记录同一天的变化，恋爱记录收藏日常，旅行地图点亮共同去过的城市。
        </p>

        <div className="hero__toolbar">
          <nav className="top-nav" aria-label="主导航">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-pill${isActive ? ' nav-pill--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hero__floating">
          <div className="auth-badge">
            <div className="auth-badge__head">
              <div className="auth-badge__avatar" aria-hidden="true">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <span>{user?.username?.[0] || '?'}</span>
                )}
              </div>
              <span className="auth-badge__identity">
                {isAdmin ? '管理员' : '用户'}：{user?.username || '-'}
                {user?.matchCode ? ` · 匹配码：${user.matchCode}` : ''}
              </span>
            </div>

            <div className="auth-badge__actions">
              {!isAdmin ? (
                <>
                  <button className="ghost" type="button" onClick={handleRenameUsername}>
                    修改用户名
                  </button>
                  <button className="ghost" type="button" onClick={handleChangePassword}>
                    修改密码
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => avatarUploadRef.current?.click()}
                  >
                    修改头像
                  </button>
                  <input
                    ref={avatarUploadRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarInput}
                  />
                </>
              ) : null}
              <button className="ghost" type="button" onClick={logout}>
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/love" element={<LovePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route
          path="/me"
          element={
            <ProtectedRoute requireAdmin>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <LoveStoryProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </LoveStoryProvider>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
