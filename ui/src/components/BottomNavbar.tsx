import { cloneElement } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
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
  const iconElement = icon.hasVariants ? cloneElement(icon.icon, { variant }) : icon.icon;
  return (
    <div className="navbar-item">{children ?? <Button onClick={onClick} icon={iconElement} />}</div>
  );
}

function NavbarNotificationsItem() {
  const { variant, onClick } = useNavbarItem('/notifications');
  const notifsNewCount = useSelector<RootState>(
    (state) => state.main.notifications.newCount
  ) as number;
  return (
    <ButtonNotifications
      onClick={onClick}
      className="navbar-item"
      count={notifsNewCount}
      iconVariant={variant}
    />
  );
}

function useNavbarItem(to: string): {
  variant: 'bold' | 'outline';
  onClick: () => void;
} {
  const location = useLocation();
  const history = useHistory();
  const variant = location.pathname === to ? 'bold' : 'outline';
  const onClick = () => {
    history.push(to);
  };
  return {
    variant,
    onClick,
  };
}
