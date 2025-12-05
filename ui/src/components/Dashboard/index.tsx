import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { ButtonHamburger } from '../Button';
import Sidebar from './Sidebar';

export interface DashboardProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  sidebarMenu?: React.ReactNode;
}

function Dashboard({ title, children, sidebarMenu }: DashboardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenuVisible = () => setMenuVisible((v) => !v);

  useEffect(() => {
    const before = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'var(--color-bg)';
    document.documentElement.classList.add('no-wrap');
    return () => {
      document.body.style.backgroundColor = before;
      document.documentElement.classList.remove('no-wrap');
    };
  }, []);

  return (
    <div className="page-content dashboard">
      <div className="navbar dashboard-head">
        <div className="inner-wrap">
          <div className="left">
            <h1>{title}</h1>
          </div>
          <div className="right is-t">
            <ButtonHamburger onClick={toggleMenuVisible} />
          </div>
        </div>
      </div>
      <div className="dashboard-wrap">
        <Sidebar
          onMenuItemClick={toggleMenuVisible}
          className={clsx(menuVisible && 'is-menu-visible')}
        >
          {sidebarMenu}
        </Sidebar>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}

export default Dashboard;
