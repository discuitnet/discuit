import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getGlobalAppData } from '../../appData';
import { ButtonClose } from '../../components/Button';
import Link from '../../components/Link';
import MiniFooter from '../../components/MiniFooter';
import Sidebar from '../../components/Sidebar';
import { isDeviceIos, isDeviceStandalone } from '../../helper';
import { User } from '../../serverTypes';
import { MainState, showAppInstallButton } from '../../slices/mainSlice';
import { RootState } from '../../store';
import LoginForm from '../../views/LoginForm';
import PostsFeed, { PostsFeedType } from '../../views/PostsFeed';
import WelcomeBanner from '../../views/WelcomeBanner';
import ButtonAppInstall, { DeferredInstallPrompt } from './ButtonAppInstall';

const Home = () => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  const location = useLocation();
  const getFeedType = (user: User | null, pathname: string): PostsFeedType => {
    let f: PostsFeedType = 'all';
    if (user !== null) {
      if (user.homeFeed === 'all') {
        f = pathname === '/' ? 'all' : 'subscriptions';
      } else {
        f = pathname === '/' ? 'subscriptions' : 'all';
      }
    }
    return f;
  };
  const [feedType, setFeedType] = useState<PostsFeedType>(getFeedType(user, location.pathname));
  useEffect(() => {
    setFeedType(getFeedType(user, location.pathname));
  }, [user, location.pathname]);

  const { show: showInstallPrompt, deferredPrompt } = useSelector<RootState>(
    (state) => state.main.appInstallButton
  ) as MainState['appInstallButton'];

  const dispatch = useDispatch();
  const [neverShowBanner, setNeverShowBanner] = useState(
    localStorage.getItem('neverShowInstallBanner') === 'true'
  );

  const deviceStandalone = isDeviceStandalone();

  useEffect(() => {
    if (!deviceStandalone || !neverShowBanner) {
      if ('onbeforeinstallprompt' in window) {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          dispatch(showAppInstallButton(true, e));
        });
        const deferredInstallPrompt = getGlobalAppData().deferredInstallPrompt;
        if (deferredInstallPrompt) {
          dispatch(showAppInstallButton(true, deferredInstallPrompt));
        }
      } else {
        // probably iOS
        if (isDeviceIos()) {
          dispatch(showAppInstallButton(true));
        }
      }
    }
  }, [dispatch, neverShowBanner, deviceStandalone]);

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
              <ButtonAppInstall
                className="banner-install-button"
                deferredPrompt={deferredPrompt as DeferredInstallPrompt}
              >
                Install
              </ButtonAppInstall>
              <ButtonClose onClick={handleNeverShowBanner} style={{ color: 'inherit' }} />
            </div>
          </div>
        )}
        {loggedIn && !deviceStandalone && (
          <Link
            to="/new"
            className="button button-main is-m"
            style={{ borderRadius: 0, marginBottom: 'calc(var(--gap) / 2)' }}
          >
            Create post
          </Link>
        )}
        <PostsFeed feedType={feedType} communityId={null} />
      </main>
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
