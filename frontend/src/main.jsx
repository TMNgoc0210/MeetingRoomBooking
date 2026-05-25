import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e1e',
            color: '#f0ece4',
            border: '1px solid #2e2a24',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#4caf8a', secondary: '#1e1e1e' } },
          error: { iconTheme: { primary: '#e05c5c', secondary: '#1e1e1e' } },
          duration: 3000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
