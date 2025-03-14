import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import AppUpdate from './AppUpdate';
import { ButtonClose } from './components/Button';
import Chat from './components/Chat';
import CreateCommunity from './components/CreateCommunity';
import LoginPrompt from './components/LoginPrompt';
import Modal from './components/Modal';
import Navbar from './components/Navbar';
import NotificationsView from './components/Navbar/NotificationsView';
import SaveToListModal from './components/SaveToListModal';
import Sidebar from './components/Sidebar';
import Signup from './components/Signup';
import Snacks from './components/Snacks';
import Elements from './Elements';
import { isDeviceStandalone, mfetchjson } from './helper';
import { useCanonicalTag, useLoading, useWindowWidth } from './hooks';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import AllCommunities from './pages/AllCommunities';
import AppLoading from './pages/AppLoading';
import Community from './pages/Community';
import Guidelines from './pages/Guidelines';
import Home from './pages/Home';
import { List, Lists } from './pages/Lists';
import Login from './pages/Login';
import MarkdownGuide from './pages/MarkdownGuide';
import ModeratorGuidelines from './pages/ModeratorGuidelines';
import Modtools from './pages/Modtools';
import NewPost from './pages/NewPost';
import NotFound from './pages/NotFound';
import Offline from './pages/Offline';
import Post from './pages/Post';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Settings from './pages/Settings';
import { getDevicePreference } from './pages/Settings/devicePrefs';
import Terms from './pages/Terms';
import User from './pages/User';
import PushNotifications from './PushNotifications';
import {
  createCommunityModalOpened,
  initialFieldsSet,
  loginModalOpened,
  markNotificationAsSeen,
  signupModalOpened,
  snackAlert,
  toggleSidebarOpen,
  userLoggedIn,
} from './slices/mainSlice';
import LoginForm from './views/LoginForm';

// Value taken from _mixins.scss file.
const tabletBreakpoint = 1170;

// Global data, use sparingly.
if (!window.appData) window.appData = {};
window.appData.historyLength = 0;

const App = () => {
  const dispatch = useDispatch();

  // Note that window.navigator.onLine cannot always be trusted. It's false
  // value can be trusted, but it's true value cannot be.
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  useEffect(() => {
    const listner = () => {
      const online = window.navigator.onLine;
      if (online) {
        setTimeout(() => setIsOnline(online), 2000);
      } else {
        setIsOnline(online);
      }
    };
    window.addEventListener('online', listner);
    window.addEventListener('offline', listner);
    return () => {
      window.removeEventListener('online', listner);
      window.removeEventListener('offline', listner);
    };
  }, []);

  const [loading, setLoading] = useLoading();
  useEffect(() => {
    if (!isOnline) return;
    (async function () {
      // See if user is logged in. This is the first API call.
      try {
        // const initial = await mfetchjson('/api/_initial');
        const res = await fetch('/api/_initial');

        if (!res.ok) {
          if (res.status === 408) {
            // Network error
            setIsOnline(false);
          } else {
            throw new Error(await res.text());
          }
        }

        const initial = await res.json();

        // Save CSRF token in localStorage because service workers don't cache
        // Cookies.
        window.localStorage.setItem('csrftoken', res.headers.get('Csrf-Token'));

        dispatch(initialFieldsSet(initial));
      } catch (err) {
        console.error(err);
        dispatch(snackAlert('Something went wrong.'));
      }
      setLoading('loaded');
    })();
  }, [isOnline]);

  // Analytics.
  useEffect(() => {
    if (!isOnline) return;
    const f = async () => {
      if (isDeviceStandalone()) {
        // Track PWA use.
        try {
          await mfetchjson(`/api/analytics`, {
            method: 'POST',
            body: JSON.stringify({
              event: 'pwa_use',
            }),
          });
        } catch (error) {
          console.error(error);
        }
      }
    };
    f();
  }, [isOnline]);

  // Check if there're new notifications every 5 secs.
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  useEffect(() => {
    if (loggedIn) {
      const timerId = setInterval(async () => {
        try {
          const rUser = await mfetchjson(`/api/_user`);
          dispatch(userLoggedIn(rUser));
        } catch (error) {
          console.error(error);
        }
      }, 5000);
      return () => clearInterval(timerId);
    }
  }, [loggedIn]);

  const width = useWindowWidth();
  const chatOpen = useSelector((state) => state.main.chatOpen);
  const sidebarOpen = useSelector((state) => state.main.sidebarOpen);
  const overlayRef = useCallback((node) => {
    if (node !== null) {
      setTimeout(() => {
        node.style.opacity = 1;
      }, 0);
    }
  }, []);
  useEffect(() => {
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen]);

  const notifsNewCount = useSelector((state) => state.main.notifications.newCount);
  const notifsNewCountStr = notifsNewCount > 0 ? `(${notifsNewCount}) ` : '';
  const titleTemplate = `${notifsNewCountStr} %s - ${import.meta.env.VITE_SITENAME}`;

  const loginModalOpen = useSelector((state) => state.main.loginModalOpen);
  const signupModalOpen = useSelector((state) => state.main.signupModalOpen);

  const createCommunityOpen = useSelector((state) => state.main.createCommunityModalOpen);

  // Offline page is only rendered if the user goes to a new page while the
  // internet connectivity is lost.
  const [showOfflinePage, setShowOfflinePage] = useState(!window.navigator.onLine);
  const location = useLocation();
  useEffect(() => {
    setShowOfflinePage(!window.navigator.onLine);
  }, [location]);
  useEffect(() => {
    if (isOnline) setShowOfflinePage(false);
  }, [isOnline]);

  // Device preferences:
  const settingsChanged = useSelector((state) => state.main.settingsChanged);
  useEffect(() => {
    if (getDevicePreference('font') === 'system') {
      document.documentElement.classList.add('is-system-font');
      return () => {
        document.documentElement.classList.remove('is-system-font');
      };
    }
  }, [settingsChanged]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifId = params.get('fromNotif');
    if (notifId) {
      dispatch(markNotificationAsSeen(notifId));
    }
  }, [location, dispatch]);

  if (!isOnline && showOfflinePage) {
    return <Offline />;
  }

  if (loading === 'initial') {
    return null;
  } else if (loading === 'loading') {
    return <AppLoading />;
  }

  return (
    <>
      <Helmet
        defaultTitle={`${notifsNewCountStr} ${import.meta.env.VITE_SITENAME}`}
        titleTemplate={titleTemplate}
      >
        <meta property="og:site_name" content={import.meta.env.VITE_SITENAME} />
      </Helmet>
      <ScrollToTop />
      <CanonicalTag />
      <Navbar />
      <AppUpdate />
      <PushNotifications />
      {width <= tabletBreakpoint && <Sidebar isMobile />}
      {sidebarOpen && (
        <div
          className="body-overlay"
          onClick={() => dispatch(toggleSidebarOpen())}
          ref={overlayRef}
        ></div>
      )}
      <AppSwitch />
      <Snacks />
      {import.meta.env.MODE !== 'production' && chatOpen && <Chat />}
      <SaveToListModal />
      <LoginPrompt />
      <Signup open={signupModalOpen} onClose={() => dispatch(signupModalOpened(false))} />
      <Modal
        open={loginModalOpen}
        onClose={() => dispatch(loginModalOpened(false))}
        noOuterClickClose={false}
      >
        <div className="modal-card modal-form modal-login">
          <div className="modal-card-head">
            <div className="modal-card-title">Login</div>
            <ButtonClose onClick={() => dispatch(loginModalOpened(false))} />
          </div>
          <LoginForm isModal />
        </div>
      </Modal>
      <CreateCommunity
        open={createCommunityOpen}
        onClose={() => dispatch(createCommunityModalOpened(false))}
      />
    </>
  );
};

export default App;

const AppSwitch = () => {
  return (
    <>
      <Switch>
        {import.meta.env.MODE !== 'production' && <Route path="/elements" component={Elements} />}
        {/*
        <Route exact path="/search">
          <Search />
        </Route>
        */}
        <ProtectedRoute path="/notifications">
          <div className="page-content page-notifications wrap">
            <NotificationsView />
          </div>
        </ProtectedRoute>
        <ProtectedRoute path="/new">
          <NewPost />
        </ProtectedRoute>
        <ProtectedRoute path="/settings">
          <Settings />
        </ProtectedRoute>
        <Route exact path="/login">
          <Login />
        </Route>
        <Route exact path={['/', '/subscriptions', '/all']}>
          <Home />
        </Route>
        <Route exact path="/communities">
          <AllCommunities />
        </Route>
        <ProtectedRoute path="/admin">
          <AdminDashboard />
        </ProtectedRoute>
        <Route exact path="/about">
          <About />
        </Route>
        <Route exact path="/guidelines">
          <Guidelines />
        </Route>
        <Route exact path="/moderator-guidelines">
          <ModeratorGuidelines />
        </Route>
        <Route exact path="/terms">
          <Terms />
        </Route>
        <Route exact path="/privacy-policy">
          <PrivacyPolicy />
        </Route>
        <Route exact path="/markdown_guide">
          <MarkdownGuide />
        </Route>
        <Route exact path="/@:username">
          <User />
        </Route>
        <Route exact path="/@:username/lists">
          <Lists />
        </Route>
        <Route exact path="/@:username/lists/:listName">
          <List />
        </Route>
        <Route exact path="/:name">
          <Community />
        </Route>
        <ProtectedRoute path="/:name/modtools">
          <Modtools />
        </ProtectedRoute>
        <Route exact path={['/:name/post/:id', '/:name/post/:id/:commentId']}>
          <Post />
        </Route>
        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </>
  );
};

/*
 * Redirects the logged out user to the login page.
 *
 */
const ProtectedRoute = ({ children, ...rest }) => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  return (
    <Route
      {...rest}
      render={({ location }) =>
        loggedIn ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: location },
            }}
          />
        )
      }
    />
  );
};

ProtectedRoute.propTypes = {
  children: PropTypes.element,
};

/*
 * Scroll to top when moving between pages unless
 * the user is using back and forward buttons of the
 * browser.
 *
 */
const ScrollToTop = () => {
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    if (history.action !== 'POP') window.scrollTo(0, 0);
    window.appData.historyLength++;
  }, [location.pathname]);

  return null;
};

const CanonicalTag = () => {
  const location = useLocation();
  useCanonicalTag(window.location.origin + window.location.pathname, [location]);
  return null;
};
