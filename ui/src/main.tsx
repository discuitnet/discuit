import PullToRefresh from 'pulltorefreshjs';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { forceSwUpdate } from './AppUpdate';
import { isDeviceIos } from './helper';
import './scss/styles.scss';
import store from './store';

const Fallback = ({ error }: { error: Error }) => {
  useEffect(() => {
    forceSwUpdate();
  }, []);

  const [reloadDisabled, setReloadDisabled] = useState(false);
  const handleReload = async () => {
    try {
      setReloadDisabled(true);
      await forceSwUpdate();
    } catch (error) {
      console.error(error);
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

const logAppError = (/* error, info */) => {
  // Send analytics request to server.
  // mfetchjson(`/api/analytics`)
};

const container = document.getElementById('root');
const root = createRoot(container!);

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

  // Workaround for a bug in Safari 16.0-16.3 where optical size of fonts was not automatically
  // adjusted based on the font size.
  // See; https://bugs.webkit.org/show_bug.cgi?id=247987
  if (
    (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Version/16.0')) ||
    navigator.userAgent.includes('Version/16.1') ||
    navigator.userAgent.includes('Version/16.2') ||
    navigator.userAgent.includes('Version/16.3')
  ) {
    document.documentElement.classList.add('safari16');
  }
}
