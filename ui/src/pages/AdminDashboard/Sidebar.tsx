import clsx from 'clsx';
import { Link, useRouteMatch } from 'react-router-dom';

function Sidebar({ className }: { className?: string }) {
  const { url } = useRouteMatch();
  const dashboardLink = (path: string) => {
    return `${url}/${path}`;
  };
  return (
    <aside className={clsx('sidebar sidebar-left is-custom-scrollbar is-v2', className)}>
      <div className="sidebar-content">
        <div className="sidebar-list">
          <Link className="sidebar-item" to={url}>
            Home
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
