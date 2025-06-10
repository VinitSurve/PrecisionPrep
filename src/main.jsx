import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/Dashboard.css'
import './styles/SubjectTimer.css'
import './styles/SubjectAnalytics.css'
import './styles/TabSwitchAlert.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Use non-blocking render
root.render(
  <App />
)