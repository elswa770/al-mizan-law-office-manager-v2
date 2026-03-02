import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);

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