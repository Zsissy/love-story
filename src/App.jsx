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

function AppShell() {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const navItems = isAdmin
    ? [...baseNavItems, { to: '/me', label: '我的' }]
    : baseNavItems

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

          <div className="auth-badge">
            <span>
              {isAdmin ? '管理员' : '用户'}：{user?.username || '-'}
            </span>
            <button className="ghost" type="button" onClick={logout}>
              退出登录
            </button>
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
