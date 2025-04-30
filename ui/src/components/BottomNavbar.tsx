import clsx from 'clsx';
import { cloneElement, useLayoutEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { useLinkClick } from '../hooks';
import { User } from '../serverTypes';
import { RootState } from '../store';
import { SVGAdd, SVGCommunities, SVGHome } from '../SVGs';
import Button, { ButtonNotifications } from './Button';
import CommunityProPic from './CommunityProPic';

const scrollPositions: { [key: string]: number | undefined } = {};

export default function BottomNavbar() {
  const user = useSelector<RootState>((state) => state.main.user) as User;

  const homePath = '/',
    communitiesPath = '/communities',
    newPath = '/new',
    notificationsPath = '/notifications',
    usernamePath = `/@${user.username}`;

  const tabPaths = useMemo(() => {
    return [homePath, communitiesPath, notificationsPath, usernamePath];
  }, [usernamePath]);

  const history = useHistory();
  const location = useLocation();
  useLayoutEffect(() => {
    const state = location.state as { fromBottomNav: boolean };
    if (
      history.action !== 'POP' &&
      tabPaths.includes(location.pathname) &&
      state &&
      state.fromBottomNav
    ) {
      const scrollY = scrollPositions[location.pathname] || 0;
      console.log(`Scrolling to: ${scrollY}`);
      window.scrollTo(0, scrollY);
    }
    return () => {
      if (tabPaths.includes(location.pathname)) {
        scrollPositions[location.pathname] = window.scrollY;
      }
    };
  }, [location, history, tabPaths]);

  return (
    <div className="bottom-navbar">
      <NavbarItem to={homePath} icon={{ hasVariants: true, icon: <SVGHome /> }} />
      <NavbarItem to={communitiesPath} icon={{ hasVariants: true, icon: <SVGCommunities /> }} />
      <NavbarItem to={newPath} icon={{ hasVariants: true, icon: <SVGAdd /> }} />
      <NavbarNotificationsItem />
      <NavbarItem
        to={usernamePath}
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
    <div className="navbar-item">
      {children ?? (
        <Button
          onClick={onClick}
          icon={iconElement}
          className={clsx(variant === 'bold' && 'is-bold')}
        />
      )}
    </div>
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
  const onClick = useLinkClick(to, undefined, undefined, false, { fromBottomNav: true });
  return {
    variant,
    onClick,
  };
}
