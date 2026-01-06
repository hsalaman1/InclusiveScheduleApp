import React from 'react'
import ReactDOM from 'react-dom/client'
import { SchedulerProvider } from './context/SchedulerContext'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SchedulerProvider>
      <App />
    </SchedulerProvider>
  </React.StrictMode>,
)
