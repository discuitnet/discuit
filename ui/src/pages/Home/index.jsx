import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ButtonClose } from '../../components/Button';
import Link from '../../components/Link';
import MiniFooter from '../../components/MiniFooter';
import Modal from '../../components/Modal';
import Sidebar from '../../components/Sidebar';
import { isDeviceIos, isDeviceStandalone } from '../../helper';
import { createCommunityModalOpened, showAppInstallButton } from '../../slices/mainSlice';
import LoginForm from '../../views/LoginForm';
import PostsFeed from '../../views/PostsFeed';
import WelcomeBanner from '../../views/WelcomeBanner';

const Home = () => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  const canCreateForum = loggedIn && (user.isAdmin || !import.meta.env.VITE_DISABLEFORUMCREATION);

  const location = useLocation();
  const feedType = (() => {
    let f = 'all';
    if (loggedIn) {
      f = location.pathname === '/' ? user.homeFeed : location.pathname.substring(1);
    }
    return f;
  })();

  const { show: showInstallPrompt, deferredPrompt } = useSelector(
    (state) => state.main.appInstallButton
  );

  const dispatch = useDispatch();
  const [neverShowBanner, setNeverShowBanner] = useState(
    localStorage.getItem('neverShowInstallBanner') === 'true'
  );

  useEffect(() => {
    if (!isDeviceStandalone() || !neverShowBanner) {
      if ('onbeforeinstallprompt' in window) {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          dispatch(showAppInstallButton(true, e));
        });
        if (window.appData && window.appData.deferredInstallPrompt) {
          dispatch(showAppInstallButton(true, window.appData.deferredInstallPrompt));
        }
      } else {
        // probably iOS
        if (isDeviceIos()) {
          dispatch(showAppInstallButton(true));
        }
      }
    }
  }, [dispatch, neverShowBanner]);

  const handleNeverShowBanner = () => {
    localStorage.setItem('neverShowInstallBanner', 'true');
    setNeverShowBanner(true);
  };

  return (
    <div className="page-content page-home wrap page-grid">
      <Sidebar />
      <main className="posts">
        {showInstallPrompt && !neverShowBanner && (
          <div className="banner-install is-m">
            <div className="banner-install-text">Get the app for a better experience.</div>
            <div className="banner-install-actions">
              <ButtonAppInstall className="banner-install-button" deferredPrompt={deferredPrompt}>
                Install
              </ButtonAppInstall>
              <ButtonClose onClick={handleNeverShowBanner} style={{ color: "inherit" }} />
            </div>
          </div>
        )}
        {loggedIn && (
          <Link className="button button-main home-btn-new-post is-m" to="/new">
            Create post
          </Link>
        )}
        {canCreateForum && (
          <>
            <Link
              onClick={() => dispatch(createCommunityModalOpened())}
              className={'button button-main home-btn-new-post is-m'}
            >
              Create community
            </Link>
          </>
        )}
        <PostsFeed feedType={feedType} />
      </main>
      {/*
      <div className="posts">
        <div className="post-card-compact-list">
          <PostCard initialPost={templatePost} compact={true} />
          <PostCard initialPost={templatePost} compact={true} />
          <PostCard initialPost={templatePost} compact={true} />
        </div>
      </div>*/}
      <aside className="sidebar-right is-custom-scrollbar is-v2'">
        {!loggedIn && (
          <div className="card card-sub card-padding">
            <LoginForm />
          </div>
        )}
        <WelcomeBanner />
        <MiniFooter />
      </aside>
    </div>
  );
};

export default Home;

export const ButtonAppInstall = ({ deferredPrompt, children, ...props }) => {
  const [showIosModal, setShowIosModal] = useState(false);
  const handleIosModalClose = () => setShowIosModal(false);

  const handleClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      // show iOS modal
      setShowIosModal(true);
    }
  };

  return (
    <>
      <button {...props} onClick={handleClick}>
        {children}
      </button>
      <Modal open={showIosModal} onClose={handleIosModalClose}>
        <div className="modal-card is-compact-mobile modal-ios-install">
          <div className="modal-card-head">
            <div className="modal-card-title">Steps to install</div>
            <ButtonClose onClick={handleIosModalClose} />
          </div>
          <div className="modal-card-content">
            <div className="modal-ios-install-steps">
              <ol>
                <li>1. Tap on the Safari share button.</li>
                <li>{`2. Tap on "Add to Home Screen."`}</li>
                <li>{`3. Tap on "Add."`}</li>
              </ol>
              <p>Note that web apps on iOS can only be installed using Safari.</p>
            </div>
          </div>
          <div className="modal-card-actions">
            <button onClick={handleIosModalClose}>Close</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

ButtonAppInstall.propTypes = {
  deferredPrompt: PropTypes.object,
  children: PropTypes.node.isRequired,
};
