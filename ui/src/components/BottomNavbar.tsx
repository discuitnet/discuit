import { cloneElement, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useLinkClick } from '../hooks';
import { User } from '../serverTypes';
import { RootState } from '../store';
import { SVGAdd, SVGCommunities, SVGHome } from '../SVGs';
import Button, { ButtonNotifications } from './Button';
import CommunityProPic from './CommunityProPic';

export default function BottomNavbar() {
  const user = useSelector<RootState>((state) => state.main.user) as User;
  return (
    <div className="bottom-navbar">
      <NavbarItem to="/" icon={{ hasVariants: true, icon: <SVGHome /> }} />
      <NavbarItem to="/communities" icon={{ hasVariants: true, icon: <SVGCommunities /> }} />
      <NavbarItem to="/new" icon={{ hasVariants: true, icon: <SVGAdd /> }} />
      <NavbarNotificationsItem />
      <NavbarItem
        to={`/@${user.username}`}
        icon={{
          hasVariants: false,
          icon: <CommunityProPic proPic={user ? user.proPic : null} size="small" />,
        }}
      />
    </div>
  );
}

function NavbarItem({
  icon,
  to,
  children,
}: {
  icon: { icon: React.ReactElement; hasVariants: boolean };
  to: string;
  children?: React.ReactNode;
}) {
  const { variant, onClick } = useNavbarItem(to);
  const iconElement = useMemo(() => {
    return icon.hasVariants ? cloneElement(icon.icon, { variant }) : icon.icon;
  }, [icon.hasVariants, icon.icon, variant]);
  return (
    <div className="navbar-item">{children ?? <Button onClick={onClick} icon={iconElement} />}</div>
  );
}

function NavbarNotificationsItem() {
  const path = '/notifications';
  const { variant, onClick } = useNavbarItem(path);
  const notifsNewCount = useSelector<RootState>(
    (state) => state.main.notifications.newCount
  ) as number;
  const handleClick = (event: React.MouseEvent) => {
    if (window.location.pathname === path) {
      const notifsEl = document.querySelector('.page-content > .notifs');
      if (notifsEl) {
        notifsEl.scrollTo(0, 0);
      }
    }
    onClick(event);
  };
  return (
    <ButtonNotifications
      onClick={handleClick}
      className="navbar-item"
      count={notifsNewCount}
      iconVariant={variant}
    />
  );
}

function useNavbarItem(to: string): {
  variant: 'bold' | 'outline';
  onClick: (event: React.MouseEvent) => void;
} {
  const location = useLocation();
  const variant = location.pathname === to ? 'bold' : 'outline';
  const onClick = useLinkClick(to);
  return {
    variant,
    onClick,
  };
}
