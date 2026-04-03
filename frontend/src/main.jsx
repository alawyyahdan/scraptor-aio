import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { getAccessAuthHeaders, invalidateAccessToken } from './utils/apiAccess'

axios.interceptors.request.use(async (config) => {
  if (config.headers?.Authorization) return config
  const u = String(config.url || '')
  if (
    u.includes('/public/config') ||
    u.includes('/public/access-token') ||
    u.includes('/api/auth/login')
  ) {
    return config
  }
  const h = await getAccessAuthHeaders()
  Object.assign(config.headers, h)
  return config
})

axios.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config
    if (!cfg || cfg.__scraptorRetried || err.response?.status !== 401) {
      throw err
    }
    if (String(cfg.url || '').includes('access-token')) throw err
    cfg.__scraptorRetried = true
    invalidateAccessToken()
    const h = await getAccessAuthHeaders()
    Object.assign(cfg.headers, h)
    return axios(cfg)
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
