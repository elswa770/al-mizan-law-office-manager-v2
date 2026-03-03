import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { offlineManager } from './services/offlineManager';

// Enhanced Service Worker Registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Try to register the enhanced service worker first
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw-enhanced.js');
        console.log('Enhanced SW registered: ', registration);
      } catch (enhancedError) {
        // Fallback to original service worker
        console.warn('Enhanced SW failed, falling back to original:', enhancedError);
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Original SW registered: ', registration);
      }

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (confirm('تحديث جديد متاح! هل تريد تثبيته الآن؟')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          if (confirm(`تحديث جديد متاح! الإصدار ${event.data.version} متاح (الحالي: ${event.data.currentVersion}). هل تريد التثبيت الآن؟`)) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });

      // Initialize offline manager (will initialize DB automatically)
      console.log('Service worker and offline manager initialized');

    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Register service worker before rendering
registerServiceWorker().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});