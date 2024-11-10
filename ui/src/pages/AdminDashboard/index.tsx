import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { ButtonHamburger } from '../../components/Button';
import { RootState } from '../../store';
import Forbidden from '../Forbidden';
import Comments from './Comments';
import Communities from './Communities';
import IPBans from './IPBans';
import Settings from './Settings';
import Sidebar from './Sidebar';
import Users from './Users';

function AdminDashboard() {
  const [menuVisible, setMenuVisible] = useState(true);
  const toggleMenuVisible = () => setMenuVisible((v) => !v);

  /*

  const pageRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState('0px');
  const isMobile = useIsMobile();
  const calculatePageHeight = useCallback(() => {
    if (isMobile) {
      setPageHeight('auto');
    } else if (pageRef.current) {
      const { height } = window.getComputedStyle(pageRef.current);
      setPageHeight(height);
    }
  }, [isMobile, pageRef]);
  useLayoutEffect(() => {
    calculatePageHeight();
    window.addEventListener('resize', calculatePageHeight);
    return () => {
      window.removeEventListener('resize', calculatePageHeight);
    };
  }, [calculatePageHeight]);
  */

  useEffect(() => {
    const before = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'var(--color-bg)';
    return () => {
      document.body.style.backgroundColor = before;
    };
  }, []);

  const { path } = useRouteMatch();

  const user = useSelector((state: RootState) => state.main.user)!; // user is never not null at this point
  if (!user.isAdmin) {
    return <Forbidden />;
  }

  return (
    <div className="page-content page-dashboard wrap">
      <div className="navbar page-dashboard-head">
        <div className="wrap">
          <div className="left">
            <h1>Admin dashboard</h1>
          </div>
          <div className="right is-t">
            <ButtonHamburger onClick={toggleMenuVisible} />
          </div>
        </div>
      </div>
      <div className="page-dashboard-wrap">
        <Sidebar
          onMenuItemClick={toggleMenuVisible}
          className={clsx(menuVisible && 'is-menu-visible')}
        />
        <div className="page-dashboard-content">
          <Switch>
            <Route exact path={path}>
              <Settings />
            </Route>
            <Route exact path={`${path}/users`}>
              <Users />
            </Route>
            <Route exact path={`${path}/comments`}>
              <Comments />
            </Route>
            <Route exact path={`${path}/communities`}>
              <Communities />
            </Route>
            <Route exact path={`${path}/ipbans`}>
              <IPBans />
            </Route>
            <Route path="*">
              <div className="dashboard-page-404">
                <p>Not found</p>
              </div>
            </Route>
          </Switch>
        </div>
      </div>
    </div>
  );

  /*
  return (
    <div className="page-content page-dashboard wrap">
      <div className="dashboard">
        <div className="dashboard-top">
          <div className="dashboard-name">Admin dashboard</div>
          <ButtonHamburger className="is-m" onClick={toggleMenuVisible} />
        </div>
        <div className={clsx('dashboard-wrap', menuVisible ? 'is-menu-visible' : '')}>
          <Sidebar onMenuItemClick={toggleMenuVisible} />
          <div className="dashboard-content">
            <div
              className="dashboard-content-wrap"
              ref={pageRef}
              style={{
                height: pageHeight === '0px' ? 'auto' : pageHeight,
              }}
            >
              <div
                className="dashboard-content-wrap-inner"
                style={{
                  display: pageHeight === '0px' ? 'none' : 'block',
                }}
              >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  */
}

export default AdminDashboard;
