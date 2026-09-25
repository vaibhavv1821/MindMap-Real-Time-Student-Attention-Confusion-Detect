import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'mindmap_secret_key_demo_2026',
  corsOrigin: process.env.CORS_ORIGIN || '*',
}
