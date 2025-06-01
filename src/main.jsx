import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/Dashboard.css'
import './styles/SubjectTimer.css'
import './styles/SubjectAnalytics.css'
import './styles/TabSwitchAlert.css'

// Register service worker with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Add a small delay before registering the service worker
    setTimeout(() => {
      navigator.serviceWorker.register('/serviceWorker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
    }, 1000);
  });
}

// Create a global error handler to log auth errors
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  // Report to monitoring system if needed
});

// Add a Vercel-specific boot check
const isVercel = window.location.hostname.includes('vercel.app');
if (isVercel) {
  console.log('Running on Vercel environment');
}

// Ensure we're rendering properly
const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
