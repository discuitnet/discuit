import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { clearNotificationsLocalStorage } from '../../PushNotifications';
import { kRound, mfetch, onKeyEnter, stringCount } from '../../helper';
import { mobileBreakpointWidth, useTheme, useWindowWidth } from '../../hooks';
import {
  chatOpenToggled,
  loginModalOpened,
  notificationsReloaded,
  signupModalOpened,
  snackAlert,
  snackAlertError,
  toggleSidebarOpen,
} from '../../slices/mainSlice';
import { homeReloaded } from '../../views/PostsFeed';
import Button, { ButtonHamburger, ButtonNotifications } from '../Button';
import Dropdown from '../Dropdown';
import Link from '../Link';
import Search from './Search';

const Navbar = ({ offline = false }) => {
  // Only enable background blur when scrolled down.
  const supportsBlur = () => window.CSS && window.CSS.supports('backdrop-filter', 'blur(10px)');
  const [blur, setBlur] = useState(supportsBlur() && window.scrollY > 50);
  const blurRef = useRef(blur);
  const navbarRef = useRef();
  useEffect(() => {
    if (supportsBlur()) {
      const listner = () => {
        if (window.scrollY > 50) {
          if (blurRef.current !== true) {
            blurRef.current = true;
            setBlur(true);
          }
        } else {
          if (blurRef.current !== false) {
            blurRef.current = false;
            setBlur(false);
          }
        }
      };
      window.addEventListener('scroll', listner, { passive: true });
      return () => window.removeEventListener('scroll', listner);
    }
  }, []);

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= mobileBreakpointWidth;

  const [bottomNavbarNavigation, setBottomNavbarNavigation] = useState(true);

  const location = useLocation();
  useEffect(() => {
    setBottomNavbarNavigation(Boolean(location.state && location.state.fromBottomNav));
  }, [location]);

  const renderGoBackNavbar = isMobile && !bottomNavbarNavigation && location.pathname !== '/';

  const dispatch = useDispatch();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const homeFeed = loggedIn ? user.homeFeed : 'all';
  const notifsNewCount = useSelector((state) => state.main.notifications.newCount);

  const handleLogout = async () => {
    clearNotificationsLocalStorage();
    try {
      const res = await mfetch('/api/_login?action=logout', {
        method: 'POST',
      });
      if (!res.ok) {
        snackAlert('Failed to logout. Something went wrong.');
        return;
      }
      window.location.reload();
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleLogoClick = () => {
    dispatch(homeReloaded(homeFeed, user && user.rememberFeedSort));
    setTimeout(() => window.scrollTo(0, 0), 10);
  };

  const handleHamburgerClick = () => {
    dispatch(toggleSidebarOpen());
  };

  const handleNotifIconClick = () => {
    if (location.pathname === '/notifications') {
      dispatch(notificationsReloaded());
    }
  };

  const { theme, setTheme } = useTheme();
  const handleDarkModeChange = (e) => {
    const checked = e.target.checked;
    setTheme(checked ? 'dark' : 'light');
  };

  const history = useHistory();

  return (
    <header
      className={clsx('navbar', blur && 'is-blured', renderGoBackNavbar && 'is-go-back')}
      ref={navbarRef}
    >
      <div className="wrap">
        <div className="left">
          {renderGoBackNavbar ? (
            <Button
              onClick={() => history.goBack()}
              variant="text"
              noBackground
              icon={<SVGLongArrow />}
            >
              Back
            </Button>
          ) : (
            <>
              <div className="hamburger-m">
                <ButtonHamburger onClick={handleHamburgerClick} />
              </div>
              <Link
                to="/"
                className="navbar-logo"
                style={{ fontSize: '1.65rem' }}
                onClick={handleLogoClick}
              >
                {import.meta.env.VITE_SITENAME}
              </Link>
            </>
          )}
          <Search />
        </div>
        <div className="right">
          {import.meta.env.MODE !== 'production' && (
            <button
              className="button-text is-no-m"
              onClick={() => dispatch(chatOpenToggled())}
              disabled={offline}
            >
              Chat
            </button>
          )}
          {import.meta.env.MODE !== 'production' && (
            <Link className="is-no-m" to="/elements">
              Elements
            </Link>
          )}
          {!loggedIn && (
            <>
              <button
                className="button-text"
                onClick={() => dispatch(loginModalOpened())}
                disabled={offline}
              >
                Login
              </button>
              <button
                className="button-main"
                onClick={() => dispatch(signupModalOpened())}
                disabled={offline}
              >
                Create account
              </button>
            </>
          )}
          {/*<ButtonSearch />*/}
          {loggedIn && (
            <Link className="is-no-m" to="/notifications" onClick={handleNotifIconClick}>
              <ButtonNotifications count={notifsNewCount} />
            </Link>
          )}
          {loggedIn && (
            <Dropdown
              className="navbar-profile"
              target={
                <div className="navbar-profile-target">
                  <span className="navbar-points">{`${kRound(user.points)} ${stringCount(
                    user.points,
                    true
                  )}`}</span>
                  <span className="navbar-name">
                    @
                    {windowWidth < 400 || (isMobile && user.username.length > 10)
                      ? 'me'
                      : user.username}
                  </span>
                </div>
              }
              aligned="right"
            >
              <div className="dropdown-list">
                <Link className="link-reset dropdown-item" to="/settings">
                  Settings
                </Link>
                <Link className="link-reset dropdown-item" to={`/@${user.username}`}>
                  Profile
                </Link>
                {user.isAdmin && (
                  <Link className="link-reset dropdown-item" to={`/admin`}>
                    Admin dashboard
                  </Link>
                )}
                {/*<div className="dropdown-item">Darkmode</div>*/}
                <div className="dropdown-item is-non-reactive">
                  <div className="checkbox">
                    <input
                      id={'ch-nav-dark'}
                      className="switch"
                      type="checkbox"
                      checked={theme === 'dark'}
                      onChange={handleDarkModeChange}
                    />
                    <label htmlFor={'ch-nav-dark'}>Dark mode</label>
                  </div>
                </div>
                <div className="dropdown-list-sep"></div>
                <div
                  role="button"
                  tabIndex="0"
                  className="dropdown-item"
                  onClick={handleLogout}
                  onKeyUp={(e) => onKeyEnter(e, handleLogout)}
                >
                  Logout
                </div>
              </div>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  offline: PropTypes.bool,
};

export default Navbar;

// This element is copy-pasted and slightly modified from SVGs.tsx.
function SVGLongArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'rotate(90deg)' }}
    >
      <path
        d="M11.9991 21.2501C11.8091 21.2501 11.6191 21.1801 11.4691 21.0301L5.39914 14.9601C5.10914 14.6701 5.10914 14.1901 5.39914 13.9001C5.68914 13.6101 6.16914 13.6101 6.45914 13.9001L11.9991 19.4401L17.5391 13.9001C17.8291 13.6101 18.3091 13.6101 18.5991 13.9001C18.8891 14.1901 18.8891 14.6701 18.5991 14.9601L12.5291 21.0301C12.3791 21.1801 12.1891 21.2501 11.9991 21.2501Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
      />
      <path
        d="M12 21.08C11.59 21.08 11.25 20.74 11.25 20.33V3.5C11.25 3.09 11.59 2.75 12 2.75C12.41 2.75 12.75 3.09 12.75 3.5V20.33C12.75 20.74 12.41 21.08 12 21.08Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
}
