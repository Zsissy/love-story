/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AUTH_KEY = 'love-story-auth-v1'
const USERS_KEY = 'love-story-users-v1'
const ADMIN_USERNAME = '小茭'
const ADMIN_PASSWORD = 'zxq121800'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.username || !parsed?.role) return null
    return parsed
  } catch {
    return null
  }
}

function readStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeUsers(users) {
  return users
    .filter((user) => user && user.username)
    .map((user) => ({
      id: user.id || `user-${Date.now()}-${Math.random()}`,
      username: String(user.username).trim(),
      password: String(user.password || ''),
      role: user.role === 'admin' ? 'admin' : 'member',
      status:
        user.status === 'approved' || user.status === 'rejected'
          ? user.status
          : 'pending',
      avatar: user.avatar || '',
      createdAt: user.createdAt || new Date().toISOString(),
      reviewedAt: user.reviewedAt || '',
      reviewedBy: user.reviewedBy || '',
    }))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [users, setUsers] = useState(() => normalizeUsers(readStoredUsers()))

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user))
      return
    }
    localStorage.removeItem(AUTH_KEY)
  }, [user])

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }, [users])

  const value = useMemo(
    () => ({
      user,
      users,
      login: (username, password) => {
        const normalizedUsername = username.trim()

        if (
          normalizedUsername === ADMIN_USERNAME &&
          password === ADMIN_PASSWORD
        ) {
          const nextUser = {
            username: ADMIN_USERNAME,
            role: 'admin',
          }
          setUser(nextUser)
          return { ok: true, user: nextUser }
        }

        const found = users.find(
          (item) =>
            item.username === normalizedUsername && item.password === password,
        )

        if (!found) {
          return {
            ok: false,
            message: '用户名或密码错误',
          }
        }

        if (found.status === 'pending') {
          return {
            ok: false,
            message: '账号待管理员审核，请稍后再试。',
          }
        }

        if (found.status === 'rejected') {
          return {
            ok: false,
            message: '账号审核未通过，请联系管理员。',
          }
        }

        const nextUser = {
          id: found.id,
          username: found.username,
          role: found.role,
          avatar: found.avatar || '',
        }
        setUser(nextUser)
        return { ok: true, user: nextUser }
      },
      register: ({ username, password, avatar = '' }) => {
        const normalizedUsername = username.trim()

        if (!normalizedUsername || !password.trim()) {
          return {
            ok: false,
            message: '请填写用户名和密码。',
          }
        }

        if (normalizedUsername === ADMIN_USERNAME) {
          return {
            ok: false,
            message: '该用户名已被占用。',
          }
        }

        const exists = users.some((item) => item.username === normalizedUsername)
        if (exists) {
          return {
            ok: false,
            message: '该用户名已被注册。',
          }
        }

        const newUser = {
          id: `user-${Date.now()}`,
          username: normalizedUsername,
          password,
          role: 'member',
          status: 'pending',
          avatar,
          createdAt: new Date().toISOString(),
          reviewedAt: '',
          reviewedBy: '',
        }

        setUsers((prev) => [...prev, newUser])
        return {
          ok: true,
          message: '注册成功，等待管理员审核后可登录。',
        }
      },
      reviewUser: (id, action) => {
        const targetAction = action === 'approved' ? 'approved' : 'rejected'
        setUsers((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: targetAction,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: user?.username || ADMIN_USERNAME,
                }
              : item,
          ),
        )
      },
      setUserAvatar: (id, avatar) => {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  avatar,
                }
              : item,
          ),
        )
      },
      logout: () => setUser(null),
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
    }),
    [user, users],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
