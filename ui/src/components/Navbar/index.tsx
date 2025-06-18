import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { clearNotificationsLocalStorage } from '../../PushNotifications';
import { getGlobalAppData } from '../../appData';
import { kRound, mfetch, onKeyEnter, stringCount } from '../../helper';
import { mobileBreakpointWidth, useTheme, useWindowWidth } from '../../hooks';
import {
  chatOpenToggled,
  loginModalOpened,
  MainState,
  notificationsReloaded,
  signupModalOpened,
  snackAlert,
  snackAlertError,
  toggleSidebarOpen,
} from '../../slices/mainSlice';
import { RootState } from '../../store';
import { homeReloaded } from '../../views/PostsFeed';
import Button, { ButtonHamburger, ButtonNotifications } from '../Button';
import Dropdown from '../Dropdown';
import Link from '../Link';
import Search from './Search';

const Navbar = ({ offline = false }: { offline?: boolean }) => {
  // Only enable background blur when scrolled down.
  const supportsBlur = () => window.CSS && window.CSS.supports('backdrop-filter', 'blur(10px)');
  const [blur, setBlur] = useState(supportsBlur() && window.scrollY > 50);
  const blurRef = useRef(blur);
  const navbarRef = useRef<HTMLElement>(null);
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

  // Auto-hide the navbar when scrolling down (only on mobile).
  const recentLocationChange = useRef(false);
  const topNavbarAutohideDisabled = useSelector<RootState>(
    (state) => state.main.topNavbarAutohideDisabled
  ) as boolean;
  useLayoutEffect(() => {
    if (!isMobile || topNavbarAutohideDisabled) {
      if (navbarRef.current) {
        navbarRef.current.style.transform = `translateY(0)`;
      }
      return;
    }
    let prevScrollY = window.scrollY;
    let tdy = 0;
    const navHeight = parseInt(
      window.getComputedStyle(document.body).getPropertyValue('--navbar-height')
    );
    const buffer = 20;
    let transitioning = false;
    const navbarShouldBeInView = () => {
      return window.scrollY <= navHeight;
    };
    const setTransform = (height: number) => {
      if (!navbarRef.current) return;
      if (recentLocationChange.current) {
        if (navbarShouldBeInView()) {
          navbarRef.current.style.transform = `translateY(0)`;
        }
        return;
      }
      if (transitioning) {
        return;
      }
      navbarRef.current.style.transition = 'transform 200ms ease-in';
      transitioning = true;
      setTimeout(() => {
        if (!navbarRef.current) return;
        navbarRef.current.style.transform = `translateY(${height}px)`;
        setTimeout(() => {
          if (!navbarRef.current) return;
          navbarRef.current.style.transition = 'none';
          transitioning = false;
        }, 210);
      }, 10);
    };
    let timer: number | null = null;
    const listener = () => {
      const dy = window.scrollY - prevScrollY;
      tdy = tdy + dy;
      if (tdy < -1 * buffer) {
        setTransform(0);
        tdy = -1 * buffer;
      } else if (tdy > buffer) {
        setTransform(-1 * navHeight);
        tdy = buffer;
      }
      prevScrollY = window.scrollY;
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      // Without this, if you scroll down from (0, 0) and go back to (0, 0)
      // really fast, the navbar stays hidden, presumably because not enough
      // scroll events are being fired to run the calculations properly.
      timer = window.setTimeout(() => {
        if (window.scrollY <= navHeight) {
          setTransform(0);
        }
        timer = null;
      }, 200);
    };
    document.addEventListener('scroll', listener);
    return () => {
      document.removeEventListener('scroll', listener);
    };
  }, [isMobile, navbarRef, topNavbarAutohideDisabled]);

  const [bottomNavbarNavigation, setBottomNavbarNavigation] = useState(true);

  const location = useLocation<{ fromBottomNav: boolean }>();
  useLayoutEffect(() => {
    recentLocationChange.current = true;
    setTimeout(() => {
      recentLocationChange.current = false;
    }, 50);
    setBottomNavbarNavigation(Boolean(location.state && location.state.fromBottomNav));
  }, [location, recentLocationChange]);

  const historyLength = getGlobalAppData().historyLength || 0;
  const renderGoBackNavbar =
    isMobile && !bottomNavbarNavigation && location.pathname !== '/' && historyLength > 1;

  const dispatch = useDispatch();

  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  const homeFeed = loggedIn ? user.homeFeed : 'all';
  const notifsNewCount = useSelector<RootState>(
    (state) => state.main.notifications.newCount
  ) as MainState['notifications']['newCount'];

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
    dispatch(homeReloaded(homeFeed, Boolean(user && user.rememberFeedSort)));
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
  const handleDarkModeChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const checked = event.target.checked;
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
                  tabIndex={0}
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
