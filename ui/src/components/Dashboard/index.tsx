import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ButtonHamburger } from '../Button';
import Sidebar, { SidebarMenuItem, SidebarTopic } from './Sidebar';

interface DashboardSidebarItem {
  type?: 'item' | 'topic';
  name: string;
  icon?: React.ReactNode;
  to?: string;
}

export interface DashboardProps {
  className?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  sidebarMenu?: DashboardSidebarItem[];
}

function Dashboard({ className, title, children, sidebarMenu }: DashboardProps) {
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

  const location = useLocation();

  const renderSidebarMenuItems = (items: DashboardSidebarItem[]) => {
    return items.map((item) => {
      const key = `${item.type || 'item'}-${item.name}`;
      return item.type === 'topic' ? (
        <SidebarTopic key={key} name={item.name} />
      ) : (
        <SidebarMenuItem
          key={key}
          name={item.name}
          icon={item.icon}
          to={item.to}
          isActive={location.pathname === item.to}
        />
      );
    });
  };

  return (
    <div className={clsx('page-content dashboard', className)}>
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
          {renderSidebarMenuItems(sidebarMenu || [])}
        </Sidebar>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}

export default Dashboard;
