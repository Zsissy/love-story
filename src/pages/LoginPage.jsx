import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, isAuthenticated, storageMode, syncError } = useAuth()

  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerAvatar, setRegisterAvatar] = useState('')
  const [error, setError] = useState('')
  const [registerMessage, setRegisterMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    const result = await login(username, password)
    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.message || '登录失败')
      return
    }

    setError('')
    navigate(from, { replace: true })
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const avatar = await readAsDataUrl(file)
      setRegisterAvatar(avatar)
    } catch {
      setError('头像读取失败，请重试。')
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    const result = await register({
      username: registerUsername,
      password: registerPassword,
      avatar: registerAvatar,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.message || '注册失败')
      setRegisterMessage('')
      return
    }

    setError('')
    setRegisterMessage(result.message || '注册成功，请等待审核。')
    setRegisterUsername('')
    setRegisterPassword('')
    setRegisterAvatar('')
    setMode('login')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="登录界面">
        <p className="panel__eyebrow">Love Story 登录中心</p>
        <h2>{mode === 'login' ? '登录 Love Story' : '注册账号'}</h2>

        <div className="auth-switch" role="tablist" aria-label="登录与注册">
          <button
            type="button"
            role="tab"
            className={mode === 'login' ? 'primary' : 'ghost'}
            aria-selected={mode === 'login'}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            className={mode === 'register' ? 'primary' : 'ghost'}
            aria-selected={mode === 'register'}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            注册
          </button>
        </div>

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名"
              autoComplete="username"
              disabled={isSubmitting}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button className="primary" type="submit" disabled={isSubmitting}>
              登录
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <input
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
              placeholder="用户名"
              autoComplete="username"
              disabled={isSubmitting}
            />
            <input
              type="password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              placeholder="密码"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <label className="upload-dropzone">
              <span>上传头像（可选）</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
                disabled={isSubmitting}
              />
              <span>点击这里选择头像</span>
            </label>
            {registerAvatar ? (
              <div className="auth-avatar-preview">
                <img src={registerAvatar} alt="注册头像预览" />
              </div>
            ) : null}
            <button className="primary" type="submit" disabled={isSubmitting}>
              提交注册
            </button>
          </form>
        )}

        {storageMode === 'local' ? (
          <p className="form-error">当前为本地模式，跨设备注册审核请先配置 Supabase 云端。</p>
        ) : null}
        {syncError ? <p className="form-error">{syncError}</p> : null}
        {registerMessage ? <p className="auth-success">{registerMessage}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  )
}

export default LoginPage
