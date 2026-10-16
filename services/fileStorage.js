const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { put, get, del } = require('@vercel/blob')

const uploadsDir = path.join(__dirname, '..', 'uploads')

const isBlobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const isServerlessRuntime = () => process.env.VERCEL === '1'

const safeFilename = (originalName = 'file') => {
  const ext = path.extname(originalName).toLowerCase()
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 100) || 'file'
  return `${base}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
}

const ensureLocalUploadsDir = async () => {
  await fs.promises.mkdir(uploadsDir, { recursive: true })
}

const storeUpload = async (file, prefix = 'project-files') => {
  const filename = safeFilename(file.originalname)

  if (isBlobEnabled()) {
    const storageKey = `${prefix}/${filename}`
    const blob = await put(storageKey, file.buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.mimetype || 'application/octet-stream'
    })

    return { filename, storageKey, storageUrl: blob.url }
  }

  if (isServerlessRuntime()) {
    const error = new Error('File storage is not configured. Set BLOB_READ_WRITE_TOKEN before accepting uploads on Vercel.')
    error.status = 503
    throw error
  }

  await ensureLocalUploadsDir()
  await fs.promises.writeFile(path.join(uploadsDir, filename), file.buffer)
  return { filename, storageKey: '', storageUrl: '' }
}

const readStoredFile = async (file) => {
  if (file.storageKey || file.storageUrl) {
    const result = await get(file.storageKey || file.storageUrl, { access: 'private' })
    if (!result?.stream) throw new Error('Stored file could not be read')
    const reader = result.stream.getReader()
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks)
  }

  const filename = path.basename(file.filename || '')
  if (!filename) throw new Error('Stored file is missing a filename')
  return fs.promises.readFile(path.join(uploadsDir, filename))
}

const removeStoredFile = async (file) => {
  if (file.storageUrl || file.storageKey) {
    const keyOrUrl = file.storageUrl || file.storageKey
    await del(keyOrUrl)
    return
  }

  const filename = path.basename(file.filename || '')
  if (filename) await fs.promises.unlink(path.join(uploadsDir, filename)).catch(() => {})
}

module.exports = {
  isBlobEnabled,
  storeUpload,
  readStoredFile,
  removeStoredFile
}
