import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { ButtonHamburger, ButtonNotifications } from '../Button';
import Dropdown from '../Dropdown';
import { useDispatch, useSelector } from 'react-redux';
import {
  chatOpenToggled,
  loginModalOpened,
  notificationsReloaded,
  signupModalOpened,
  snackAlert,
  snackAlertError,
  toggleSidebarOpen,
} from '../../slices/mainSlice';
import Link from '../../components/Link';
import { kRound, mfetch, onKeyEnter, stringCount } from '../../helper';
import Search from './Search';
import { useRef } from 'react';
import { useState } from 'react';
import { homeReloaded } from '../../views/PostsFeed';
import { useLocation } from 'react-router-dom';
import { mobileBreakpointWidth, useTheme, useWindowWidth } from '../../hooks';
import { clearNotificationsLocalStorage } from '../../PushNotifications';
import { SvgLogo } from '../svg/logo';
import { DownArrow } from '../svg/icons/down-arrow';
import CommunityProPic from '../CommunityProPic';

const Navbar = ({ offline = false }) => {
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

  const location = useLocation();
  const handleNotifIconClick = () => {
    if (location.pathname === '/notifications') {
      dispatch(notificationsReloaded());
    }
  };

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

  const { theme, setTheme } = useTheme();
  const handleDarkModeChange = (e) => {
    const checked = e.target.checked;
    setTheme(checked ? 'dark' : 'light');
  };

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= mobileBreakpointWidth;

  return (
    <header className={'navbar' + (blur ? ' is-blured' : '')} ref={navbarRef}>
      <div className="wrap">
        <div className="left">
          <div className="hamburger-m">
            <ButtonHamburger onClick={handleHamburgerClick} />
          </div>
          <Link
            to="/"
            className="navbar-logo"
            style={{ fontSize: '1.65rem' }}
            onClick={handleLogoClick}
          >
            {/* {CONFIG.siteName} */}
            <SvgLogo width={50} />
          </Link>
          <Search />
        </div>
        <div className="right">
          {/* {process.env.NODE_ENV !== 'production' && (
            <button
              className="button-text is-no-m"
              onClick={() => dispatch(chatOpenToggled())}
              disabled={offline}
            >
              Chat
            </button>
          )}
          {process.env.NODE_ENV !== 'production' && (
            <Link className="is-no-m" to="/elements">
              Elements
            </Link>
          )} */}

          {loggedIn ? (
            <>
              <Link to="/notifications" onClick={handleNotifIconClick}>
                <ButtonNotifications count={notifsNewCount} />
              </Link>
              <Dropdown
                className="navbar-profile"
                target={
                  <div className="navbar-profile-target">
                    <CommunityProPic
                      name={user.username}
                      proPic={user.proPic}
                      size="small"
                      style={{
                        '--image-size': '30px',
                      }}
                    />

                    <span className="navbar-name">
                      {windowWidth < 400 || (isMobile && user.username.length > 10)
                        ? 'me'
                        : user.username}
                    </span>
                    <DownArrow />
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
            </>
          ) : (
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
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  offline: PropTypes.bool,
};

export default Navbar;
