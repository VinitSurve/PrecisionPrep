import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/Dashboard.css'
import './styles/SubjectTimer.css'
import './styles/SubjectAnalytics.css'
import './styles/TabSwitchAlert.css' // Add this new import

// Ensure we're rendering properly
const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
