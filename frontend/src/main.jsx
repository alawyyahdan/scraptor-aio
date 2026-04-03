import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { generateSignature } from './utils/signature'

// Injeksi otomatis rahasia ke seluruh permintaan Axios
axios.interceptors.request.use(async (config) => {
  const { signature, timestamp } = await generateSignature(config.url);
  config.headers['X-Scraptor-Signature'] = signature;
  config.headers['X-Scraptor-Timestamp'] = timestamp;
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
