import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

function formatDateTime(value) {
  if (!value) return '未处理'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未处理'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('头像读取失败'))
    reader.readAsDataURL(file)
  })
}

function ProfilePage() {
  const { users, reviewUser, setUserAvatar } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')

  const stats = useMemo(() => {
    const total = users.length
    const pending = users.filter((item) => item.status === 'pending').length
    const approved = users.filter((item) => item.status === 'approved').length
    const rejected = users.filter((item) => item.status === 'rejected').length
    return { total, pending, approved, rejected }
  }, [users])

  const displayedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    if (statusFilter === 'all') return sorted
    return sorted.filter((item) => item.status === statusFilter)
  }, [statusFilter, users])

  const handleAvatarChange = async (event, id) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const avatar = await readAsDataUrl(file)
      if (!avatar) return
      setUserAvatar(id, avatar)
      setError('')
    } catch {
      setError('头像上传失败，请重试。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="layout layout--single">
      <section className="panel profile-panel">
        <header className="panel__head">
          <div>
            <p className="panel__eyebrow">My · 管理员</p>
            <h2>注册用户审核</h2>
          </div>
          <div className="review-stats" aria-label="审核统计">
            <span>总用户 {stats.total}</span>
            <span>待审核 {stats.pending}</span>
            <span>已通过 {stats.approved}</span>
            <span>已拒绝 {stats.rejected}</span>
          </div>
        </header>

        <div className="review-filter">
          <button
            type="button"
            className={statusFilter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('all')}
          >
            全部
          </button>
          <button
            type="button"
            className={statusFilter === 'pending' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('pending')}
          >
            待审核
          </button>
          <button
            type="button"
            className={statusFilter === 'approved' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('approved')}
          >
            已通过
          </button>
          <button
            type="button"
            className={statusFilter === 'rejected' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('rejected')}
          >
            已拒绝
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="review-list">
          {displayedUsers.length ? (
            displayedUsers.map((item) => (
              <article className="review-card" key={item.id}>
                <div className="review-user">
                  <div className="review-avatar">
                    {item.avatar ? (
                      <img src={item.avatar} alt={`${item.username}头像`} />
                    ) : (
                      <span>{item.username.slice(0, 1)}</span>
                    )}
                  </div>

                  <div className="review-user__meta">
                    <strong>{item.username}</strong>
                    <span>注册时间：{formatDateTime(item.createdAt)}</span>
                    <span>审核时间：{formatDateTime(item.reviewedAt)}</span>
                    <span className={`status-chip status-chip--${item.status}`}>
                      {item.status === 'pending'
                        ? '待审核'
                        : item.status === 'approved'
                          ? '已通过'
                          : '已拒绝'}
                    </span>
                  </div>
                </div>

                <div className="review-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => reviewUser(item.id, 'approved')}
                    disabled={item.status === 'approved'}
                  >
                    接受
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => reviewUser(item.id, 'rejected')}
                    disabled={item.status === 'rejected'}
                  >
                    拒绝
                  </button>
                  <label className="ghost review-avatar-upload">
                    添加头像
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => handleAvatarChange(event, item.id)}
                    />
                  </label>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-note">当前筛选条件下没有用户。</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default ProfilePage
