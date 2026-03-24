import { useRef, useState } from 'react'
import { useLoveStory } from '../context/LoveStoryContext'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function LoveLogPanel() {
  const { authors, loveLogs, addLoveLog, updateLoveLog, deleteLoveLog } = useLoveStory()

  const uploadRef = useRef(null)
  const [draft, setDraft] = useState({ author: authors[0], content: '', images: [] })
  const [editingId, setEditingId] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const appendImages = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return

    const imageDataList = await Promise.all(files.map(fileToDataUrl))
    setDraft((prev) => ({ ...prev, images: [...prev.images, ...imageDataList] }))
  }

  const handleFileChange = async (event) => {
    try {
      await appendImages(event.target.files)
    } finally {
      event.target.value = ''
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    await appendImages(event.dataTransfer.files)
  }

  const handleAdd = (event) => {
    event.preventDefault()
    const ok = addLoveLog(draft)
    if (ok) {
      setDraft((prev) => ({ ...prev, content: '', images: [] }))
    }
  }

  const startEdit = (log) => {
    setEditingId(log.id)
    setEditingContent(log.content)
  }

  const saveEdit = () => {
    const ok = updateLoveLog(editingId, editingContent)
    if (!ok) return
    setEditingId('')
    setEditingContent('')
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditingContent('')
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <p className="panel__eyebrow">恋爱记录</p>
          <h2>我们一起写日常</h2>
        </div>
      </div>

      <div className="love-workspace">
        <form className="love-form love-editor" onSubmit={handleAdd}>
          <h3>编辑区</h3>
          <select
            value={draft.author}
            onChange={(event) => setDraft({ ...draft, author: event.target.value })}
            aria-label="记录作者"
          >
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
          <textarea
            value={draft.content}
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            placeholder="记录一个被爱的瞬间..."
          />

          <div
            className={`upload-dropzone${isDragging ? ' upload-dropzone--active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <p>拖拽图片到这里，或点击上传</p>
            <button
              className="ghost"
              type="button"
              onClick={() => uploadRef.current?.click()}
            >
              上传图片
            </button>
            <input
              ref={uploadRef}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </div>

          {draft.images.length > 0 ? (
            <div className="upload-preview">
              {draft.images.map((image, index) => (
                <div key={`${image}-${index}`} className="upload-preview__item">
                  <img src={image} alt={`待上传图片 ${index + 1}`} />
                  <button
                    className="ghost danger"
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        images: prev.images.filter((_, imageIndex) => imageIndex !== index),
                      }))
                    }
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button className="primary" type="submit">
            新增记录
          </button>
        </form>

        <div className="love-feed">
          <h3>展示区</h3>
          <div className="love-grid">
            {loveLogs.map((log) => (
              <article key={log.id} className="love-card">
                <div className="love-card__meta">
                  <span>{log.author}</span>
                  <time>{new Date(log.createdAt).toLocaleString('zh-CN')}</time>
                </div>

                {editingId === log.id ? (
                  <>
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                    />
                    <div className="row-actions">
                      <button className="primary" type="button" onClick={saveEdit}>
                        保存
                      </button>
                      <button className="ghost" type="button" onClick={cancelEdit}>
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{log.content}</p>
                    {Array.isArray(log.images) && log.images.length > 0 ? (
                      <div className="love-card__images">
                        {log.images.map((image, index) => (
                          <img
                            key={`${log.id}-image-${index}`}
                            src={image}
                            alt={`${log.author} 上传的图片 ${index + 1}`}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="row-actions">
                      <button className="ghost" type="button" onClick={() => startEdit(log)}>
                        编辑
                      </button>
                      <button
                        className="ghost danger"
                        type="button"
                        onClick={() => deleteLoveLog(log.id)}
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoveLogPanel
