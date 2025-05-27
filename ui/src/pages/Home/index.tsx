import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGlobalAppData } from '../../appData';
import { ButtonClose } from '../../components/Button';
import MiniFooter from '../../components/MiniFooter';
import Sidebar from '../../components/Sidebar';
import { isDeviceIos, isDeviceStandalone } from '../../helper';
import { MainState, showAppInstallButton } from '../../slices/mainSlice';
import { RootState } from '../../store';
import LoginForm from '../../views/LoginForm';
import PostsFeed from '../../views/PostsFeed';
import WelcomeBanner from '../../views/WelcomeBanner';
import ButtonAppInstall, { DeferredInstallPrompt } from './ButtonAppInstall';

const Home = () => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  // const location = useLocation();
  const feedType = (() => {
    // let f = 'all';
    // if (loggedIn) {
    //   f = location.pathname === '/' ? user.homeFeed : location.pathname.substring(1);

    // }
    // return f;
    if (loggedIn) {
      return user.homeFeed;
    }
    return 'all';
  })();

  const { show: showInstallPrompt, deferredPrompt } = useSelector<RootState>(
    (state) => state.main.appInstallButton
  ) as MainState['appInstallButton'];

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
