/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import PropTypes from 'prop-types';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Link from '../components/Link';
import { sidebarScrollYUpdated, toggleSidebarOpen } from '../slices/mainSlice';
import WelcomeBanner from '../views/WelcomeBanner';
import { ButtonClose } from './Button';
import { Separator } from './common/separator';
import { ThemeSwitch } from './common/switch/theme-switch';
import CommunityProPic from './CommunityProPic';
import Search from './Navbar/Search';
import { FlowIcon } from './svg/icons/flow';
import { GroupIcon } from './svg/icons/group';
import { HomeIcon } from './svg/icons/home';
import clsx from 'clsx';

const Sidebar = ({ isMobile = false }) => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const homeFeed = loggedIn ? user.homeFeed : 'all';
  const communities = useSelector((state) => state.main.sidebarCommunities);

  // Two variables to track visibility because CSS transitions
  // don't work for display property.
  const open = useSelector((state) => state.main.sidebarOpen);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    setTimeout(() => setVisible(open), 0);
  }, [open]);

  const handleClose = () => {
    if (open) dispatch(toggleSidebarOpen());
  };

  const location = useLocation();
  const homePageLink = (to) => {
    const params = new URLSearchParams(location.search);
    if (params.has('sort')) {
      return `${to}?sort=${params.get('sort')}`;
    }
    return to;
  };

  // const [expanded, SetExpanded] = useState(false); // communities list
  const expanded = useSelector((state) => state.main.sidebarCommunitiesExpanded);

  const renderCommunitiesList = () => {
    const renderInitially = 10,
      length = communities ? communities.length : 0,
      lengthLeft = length - renderInitially;

    return (
      <>
        {communities
          .filter((_, i) => {
            if (expanded) {
              return true;
            }
            return i < renderInitially;
          })
          .map((c) => (
            <Link
              to={`/${c.name}`}
              key={c.id}
              className="sidebar-item with-image"
              onClick={handleClose}
            >
              <CommunityProPic name={c.name} proPic={c.proPic} className="is-image is-no-hover" />
              <span>{c.name}</span>
            </Link>
          ))}
        {length > 10 && (
          <div
            className="sidebar-item with-image"
            onClick={() => dispatch({ type: 'main/sidebarCommunitiesExpandToggle' })}
          >
            <svg
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
              }}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.9995 16.8006C11.2995 16.8006 10.5995 16.5306 10.0695 16.0006L3.54953 9.48062C3.25953 9.19062 3.25953 8.71062 3.54953 8.42063C3.83953 8.13063 4.31953 8.13063 4.60953 8.42063L11.1295 14.9406C11.6095 15.4206 12.3895 15.4206 12.8695 14.9406L19.3895 8.42063C19.6795 8.13063 20.1595 8.13063 20.4495 8.42063C20.7395 8.71062 20.7395 9.19062 20.4495 9.48062L13.9295 16.0006C13.3995 16.5306 12.6995 16.8006 11.9995 16.8006Z"
                fill="currentColor"
              />
            </svg>
            <span>{expanded ? 'Show less' : `Show ${lengthLeft} more`}</span>
          </div>
        )}
      </>
    );
  };

  const ref = useRef(null);
  const scrollY = useSelector((state) => state.main.sidebarScrollY);
  useLayoutEffect(() => {
    ref.current.scrollTo(0, scrollY);
    return () => {
      if (ref.current) {
        dispatch(sidebarScrollYUpdated(ref.current.scrollTop));
      }
    };
  }, []);

  const lists = useSelector((state) => state.main.lists.lists);

  const MenuLink = ({ to, className, ...props }) => {
    return (
      <Link
        to={to}
        className={clsx(
          'sidebar-item with-image',
          {
            'is-active': location.pathname === to,
          },
          className
        )}
        onClick={handleClose}
        {...props}
      />
    );
  };

  return (
    <aside
      ref={ref}
      className={
        'sidebar sidebar-left is-custom-scrollbar is-v2' +
        (isMobile ? ' is-mobile' : '') +
        (open ? ' is-open' : '') +
        (visible ? ' is-visible' : '')
      }
    >
      <div className="sidebar-top-m">
        <h2>{CONFIG.siteName}</h2>
        <ButtonClose onClick={() => dispatch(toggleSidebarOpen())} />
      </div>
      <div className="sidebar-content">
        <nav className="sidebar-list">
          {isMobile && (
            <div className="sidebar-item is-search">
              <Search />
            </div>
          )}

          <MenuLink to={homePageLink('/')}>
            <HomeIcon />
            <span>Home</span>
          </MenuLink>
          {loggedIn && (
            <MenuLink to={homePageLink(`/${homeFeed === 'all' ? 'subscriptions' : 'all'}`)}>
              <GroupIcon />
              <span>{homeFeed === 'all' ? 'Subscriptions' : 'All'}</span>
            </MenuLink>
          )}
          <MenuLink to="/communities">
            <GroupIcon />
            <span>Communities</span>
          </MenuLink>

          <MenuLink to="/guidelines">
            <FlowIcon />
            <span>Guidelines</span>
          </MenuLink>

          <Link to="/terms" className="is-m">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="currentColor"
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M14.59 2.59c-.38-.38-.89-.59-1.42-.59H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8.83c0-.53-.21-1.04-.59-1.41l-4.82-4.83zM15 18H9c-.55 0-1-.45-1-1s.45-1 1-1h6c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H9c-.55 0-1-.45-1-1s.45-1 1-1h6c.55 0 1 .45 1 1s-.45 1-1 1zm-2-6V3.5L18.5 9H14c-.55 0-1-.45-1-1z" />
            </svg>
            <span>Terms</span>
          </Link>

          <MenuLink to="/privacy-policy" className="is-m">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="currentColor"
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M16.5 12c1.38 0 2.49-1.12 2.49-2.5S17.88 7 16.5 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zM9 11c1.66 0 2.99-1.34 2.99-3S10.66 5 9 5 6 6.34 6 8s1.34 3 3 3zm7.5 3c-1.83 0-5.5.92-5.5 2.75V18c0 .55.45 1 1 1h9c.55 0 1-.45 1-1v-1.25c0-1.83-3.67-2.75-5.5-2.75zM9 13c-2.33 0-7 1.17-7 3.5V18c0 .55.45 1 1 1h6v-2.25c0-.85.33-2.34 2.37-3.47C10.5 13.1 9.66 13 9 13z" />
            </svg>
            <span>Privacy</span>
          </MenuLink>

          <MenuLink to={`mailto:${CONFIG.emailContact}`} className="is-m">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="currentColor"
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-.4 4.25l-7.07 4.42c-.32.2-.74.2-1.06 0L4.4 8.25c-.25-.16-.4-.43-.4-.72 0-.67.73-1.07 1.3-.72L12 11l6.7-4.19c.57-.35 1.3.05 1.3.72 0 .29-.15.56-.4.72z" />
            </svg>
            <span>Contact</span>
          </MenuLink>

          <MenuLink to="/about" className="is-m">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="currentColor"
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm3.23 15.39L12 15.45l-3.22 1.94c-.38.23-.85-.11-.75-.54l.85-3.66-2.83-2.45c-.33-.29-.15-.84.29-.88l3.74-.32 1.46-3.45c.17-.41.75-.41.92 0l1.46 3.44 3.74.32c.44.04.62.59.28.88l-2.83 2.45.85 3.67c.1.43-.36.77-.74.54z" />
            </svg>
            <span>About</span>
          </MenuLink>

          <Separator
            style={{
              marginTop: 20,
              marginBottom: 20,
            }}
          />

          {loggedIn && lists.length > 0 && (
            <>
              <div className="sidebar-topic">My Lists</div>
              {lists.map((list) => (
                <Link
                  key={list.id}
                  className="sidebar-item with-image"
                  to={`/@${user.username}/lists/${list.name}`}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 5.25H14C13.59 5.25 13.25 4.91 13.25 4.5C13.25 4.09 13.59 3.75 14 3.75H21C21.41 3.75 21.75 4.09 21.75 4.5C21.75 4.91 21.41 5.25 21 5.25Z"
                      fill="currentColor"
                    />
                    <path
                      d="M21 10.25H14C13.59 10.25 13.25 9.91 13.25 9.5C13.25 9.09 13.59 8.75 14 8.75H21C21.41 8.75 21.75 9.09 21.75 9.5C21.75 9.91 21.41 10.25 21 10.25Z"
                      fill="currentColor"
                    />
                    <path
                      d="M21 15.25H3C2.59 15.25 2.25 14.91 2.25 14.5C2.25 14.09 2.59 13.75 3 13.75H21C21.41 13.75 21.75 14.09 21.75 14.5C21.75 14.91 21.41 15.25 21 15.25Z"
                      fill="currentColor"
                    />
                    <path
                      d="M21 20.25H3C2.59 20.25 2.25 19.91 2.25 19.5C2.25 19.09 2.59 18.75 3 18.75H21C21.41 18.75 21.75 19.09 21.75 19.5C21.75 19.91 21.41 20.25 21 20.25Z"
                      fill="currentColor"
                    />
                    <path
                      d="M7.92 3.5H5.08C3.68 3.5 3 4.18 3 5.58V8.43C3 9.83 3.68 10.51 5.08 10.51H7.93C9.33 10.51 10.01 9.83 10.01 8.43V5.58C10 4.18 9.32 3.5 7.92 3.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{list.displayName}</span>
                </Link>
              ))}
            </>
          )}
          <div className="sidebar-topic">{loggedIn ? 'My communities' : 'Communities'}</div>
          {renderCommunitiesList()}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <ThemeSwitch />

            <Separator
              style={{
                marginTop: 20,
                marginBottom: 20,
              }}
            />

            <div className="social-links">
              {CONFIG.facebookURL && (
                <a
                  href={CONFIG.facebookURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                    ></path>
                  </svg>
                </a>
              )}
              {CONFIG.twitterURL && (
                <a
                  href={CONFIG.twitterURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg
                    width="1200"
                    height="1227"
                    viewBox="0 0 1200 1227"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
              )}
              {CONFIG.instagramURL && (
                <a
                  href={CONFIG.instagramURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                    ></path>
                  </svg>
                </a>
              )}
              {CONFIG.discordURL && (
                <a
                  href={CONFIG.discordURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg viewBox="0 0 127.14 96.36">
                    <g id="图层_2" data-name="图层 2">
                      <g id="Discord_Logos" data-name="Discord Logos">
                        <g
                          id="Discord_Logo_-_Large_-_White"
                          data-name="Discord Logo - Large - White"
                        >
                          <path
                            fill="currentColor"
                            d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
                          />
                        </g>
                      </g>
                    </g>
                  </svg>
                </a>
              )}
              {CONFIG.githubURL && (
                <a
                  href={CONFIG.githubURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg width="98" height="96" viewBox="0 0 98 96">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
              )}
              {CONFIG.substackURL && (
                <a
                  href={CONFIG.substackURL}
                  target="_blank"
                  rel="noreferrer"
                  className="button social-link"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{ width: '80%' }}>
                    <path
                      fill="currentColor"
                      d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11L22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"
                    ></path>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </nav>
        <WelcomeBanner className="is-m" hideIfMember />
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  isMobile: PropTypes.bool,
};

export default Sidebar;
