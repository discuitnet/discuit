import clsx from 'clsx';
import { MouseEvent } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';

function Sidebar({
  className,
  onMenuItemClick,
}: {
  className?: string;
  onMenuItemClick?: () => void;
}) {
  const { url } = useRouteMatch();
  const dashboardLink = (path: string) => {
    return `${url}/${path}`;
  };

  const handleListClick = (event: MouseEvent<HTMLElement>) => {
    if (onMenuItemClick) {
      let target = event.target as HTMLElement | null;
      while (target) {
        if (target.classList.contains('sidebar-item')) {
          onMenuItemClick();
          break;
        }
        target = target.parentElement;
      }
    }
  };

  return (
    <aside className={clsx('sidebar sidebar-left is-custom-scrollbar is-v2', className)}>
      <div className="sidebar-content">
        <div className="sidebar-list" onClick={handleListClick}>
          <Link className="sidebar-item" to={url}>
            Settings
          </Link>
          <Link className="sidebar-item" to={dashboardLink('users')}>
            Users
          </Link>
          <Link className="sidebar-item" to={dashboardLink('comments')}>
            Comments
          </Link>
          <Link className="sidebar-item" to={dashboardLink('communities')}>
            Communities
          </Link>
          <Link className="sidebar-item" to={dashboardLink('ipbans')}>
            IP bans
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
