require('../config/loadEnv')

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Project = require('../models/Project')
const { storeUpload } = require('../services/fileStorage')

const uploadsDir = path.join(__dirname, '..', 'uploads')

const migrateFile = async (file) => {
  if (file.storageKey || file.storageUrl) return false
  const sourcePath = path.join(uploadsDir, path.basename(file.filename || ''))
  if (!file.filename || !fs.existsSync(sourcePath)) {
    console.warn(`Skipping missing upload: ${file.filename || 'unknown'}`)
    return false
  }

  const stored = await storeUpload({
    originalname: file.originalName || file.filename,
    mimetype: file.mimetype || 'application/octet-stream',
    buffer: await fs.promises.readFile(sourcePath)
  })

  file.filename = stored.filename
  file.storageKey = stored.storageKey
  file.storageUrl = stored.storageUrl
  return true
}

const run = async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required to migrate uploads to Vercel Blob.')
  }

  await connectDB(process.env.MONGO_URI)
  const projects = await Project.find({
    $or: [
      { 'files.0': { $exists: true } },
      { 'validation.sharedFiles.0': { $exists: true } }
    ]
  })

  let migrated = 0
  for (const project of projects) {
    let changed = false
    for (const file of project.files || []) {
      const didMigrate = await migrateFile(file)
      changed = didMigrate || changed
      if (didMigrate) migrated += 1
    }
    for (const file of project.validation?.sharedFiles || []) {
      const didMigrate = await migrateFile(file)
      changed = didMigrate || changed
      if (didMigrate) migrated += 1
    }
    if (changed) await project.save()
  }

  console.log(`Migration complete. ${migrated} file records copied to Vercel Blob.`)
  await mongoose.connection.close()
}

run().catch(async (error) => {
  console.error('Upload migration failed:', error.message)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
