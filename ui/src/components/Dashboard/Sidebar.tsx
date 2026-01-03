import clsx from 'clsx';
import { Link } from 'react-router-dom';

function Sidebar({
  className,
  onMenuItemClick,
  children,
}: {
  className?: string;
  onMenuItemClick?: () => void;
  children?: React.ReactNode;
}) {
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
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
    <aside
      className={clsx('sidebar sidebar-left is-custom-scrollbar is-v2', className)}
      onClick={handleClick}
    >
      <div className="sidebar-content">
        <div className="sidebar-list">{children}</div>
      </div>
    </aside>
  );
}

export function SidebarMenuItem({
  name,
  icon,
  to,
  isActive = false,
}: {
  name: string;
  icon?: React.ReactNode;
  to?: string;
  isActive?: boolean;
}) {
  const className = clsx('sidebar-item', icon && 'with-image', isActive && 'is-active');
  const renderChildren = () => {
    return (
      <>
        {icon}
        <span>{name}</span>
      </>
    );
  };
  if (to) {
    return (
      <Link className={className} to={to}>
        {renderChildren()}
      </Link>
    );
  }
  return <div className={className}>{renderChildren()}</div>;
}

export function SidebarTopic({ name }: { name: string }) {
  return <div className="sidebar-topic">{name}</div>;
}

export default Sidebar;
