import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import store from './store';
import PullToRefresh from 'pulltorefreshjs';
import './scss/styles.scss';
import '../manifest.json';
import './assets/imgs/logo-manifest-512.png';
import './assets/imgs/discuit-logo-pwa-badge.png';
import { isDeviceIos, mfetchjson } from './helper';
import { forceSwUpdate } from './AppUpdate';

const Fallback = ({ error, resetErrorBoundary }) => {
  useEffect(() => {
    forceSwUpdate();
  }, []);

  const [reloadDisabled, setReloadDisabled] = useState(false);
  const handleReload = async () => {
    try {
      setReloadDisabled(true);
      await forceSwUpdate();
    } catch (error) {
      console.log(error);
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="page-app-error">
      <h1>Something went wrong</h1>
      <p>{error.toString()}</p>
      <button onClick={handleReload} disabled={reloadDisabled}>
        Try reloading page
      </button>
    </div>
  );
};

const logAppError = (error, info) => {
  // Send analytics request to server.
  // mfetchjson(`/api/analytics`)
};

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <HelmetProvider>
      <ErrorBoundary FallbackComponent={Fallback} onError={logAppError}>
        <Router>
          <App />
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  </Provider>
);

if (isDeviceIos()) {
  // enable pull to refresh only for iOS devices
  document.documentElement.style.overscrollBehaviorY = 'contain';
  PullToRefresh.init({
    mainElement: `.pull-to-refresh .pull-to-refresh-target`,
    distMax: 120,
    onRefresh: () => window.location.reload(),
    refreshTimeout: 200,
    shouldPullToRefresh: () =>
      !window.scrollY && window.getComputedStyle(document.body).overflowY !== 'hidden',
  });
}
