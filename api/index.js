const connectDB = require('../config/db')
const { validateEnv } = require('../config/env')
const { initRedis } = require('../config/redisClient')

let app
let initialization

const initialize = async () => {
  if (!initialization) {
    initialization = (async () => {
      validateEnv()
      await connectDB(process.env.MONGO_URI)

      try {
        await initRedis()
      } catch (error) {
        // Redis is optional. The rate limiter uses its safe in-memory fallback.
        console.warn('[redis] unavailable in serverless runtime:', error.message)
      }

      app = require('../app')
    })().catch((error) => {
      initialization = undefined
      throw error
    })
  }

  return initialization
}

module.exports = async (req, res) => {
  try {
    await initialize()
    return app(req, res)
  } catch (error) {
    console.error('Vercel API initialization failed:', error)
    return res.status(500).json({ message: 'API initialization failed' })
  }
}
