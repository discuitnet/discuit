import clsx from 'clsx';
import { cloneElement, useLayoutEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { useLinkClick } from '../hooks';
import { User } from '../serverTypes';
import { RootState } from '../store';
import { SVGProps } from '../SVGs';
import Button, { ButtonNotifications } from './Button';

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
          icon: <SVGSearch />,
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

const defaultVariant = 'bold';

// This element is copy-pasted and slightly modified from SVGs.tsx.
export function SVGHome({ variant = defaultVariant, ...props }: SVGProps) {
  const _props = {
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    ...props,
  };
  if (variant === 'bold') {
    return (
      <svg {..._props}>
        <path
          d="M20.8593 8.36985L13.9293 2.82985C12.8593 1.96985 11.1293 1.96985 10.0693 2.81985L3.13929 8.36985C2.35929 8.98985 1.85929 10.2998 2.02929 11.2798L3.35929 19.2398C3.59929 20.6598 4.95929 21.8098 6.39929 21.8098H17.5993C19.0293 21.8098 20.3993 20.6498 20.6393 19.2398L21.9693 11.2798C22.1293 10.2998 21.6293 8.98985 20.8593 8.36985ZM11.9993 15.4998C10.6193 15.4998 9.49929 14.3798 9.49929 12.9998C9.49929 11.6198 10.6193 10.4998 11.9993 10.4998C13.3793 10.4998 14.4993 11.6198 14.4993 12.9998C14.4993 14.3798 13.3793 15.4998 11.9993 15.4998Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg {..._props}>
      <path
        d="M17.5999 22.5601H6.39985C4.57984 22.5601 2.91985 21.1601 2.61985 19.3601L1.28984 11.4001C1.07984 10.1601 1.67985 8.57011 2.66985 7.78011L9.59986 2.23006C10.9399 1.15006 13.0498 1.16007 14.3998 2.24007L21.3299 7.78011C22.3099 8.57011 22.9099 10.1601 22.7099 11.4001L21.3799 19.3601C21.0799 21.1301 19.3899 22.5601 17.5999 22.5601ZM11.9899 2.94008C11.4599 2.94008 10.9298 3.10005 10.5398 3.41005L3.60985 8.9601C3.03985 9.4201 2.64986 10.4401 2.76986 11.1601L4.09986 19.1201C4.27986 20.1701 5.32984 21.0601 6.39985 21.0601H17.5999C18.6699 21.0601 19.7198 20.1701 19.8998 19.1101L21.2298 11.1501C21.3498 10.4301 20.9499 9.40009 20.3899 8.95009L13.4599 3.41005C13.0599 3.10005 12.5299 2.94008 11.9899 2.94008Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
      <path
        d="M12 16.25C10.21 16.25 8.75 14.79 8.75 13C8.75 11.21 10.21 9.75 12 9.75C13.79 9.75 15.25 11.21 15.25 13C15.25 14.79 13.79 16.25 12 16.25ZM12 11.25C11.04 11.25 10.25 12.04 10.25 13C10.25 13.96 11.04 14.75 12 14.75C12.96 14.75 13.75 13.96 13.75 13C13.75 12.04 12.96 11.25 12 11.25Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
    </svg>
  );
}

export function SVGCommunities({ variant = defaultVariant, ...props }: SVGProps) {
  const _props = {
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    ...props,
  };
  if (variant === 'bold') {
    return (
      <svg {..._props}>
        <path
          d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM7 12.75H5C4.59 12.75 4.25 12.41 4.25 12C4.25 11.59 4.59 11.25 5 11.25H7C7.41 11.25 7.75 11.59 7.75 12C7.75 12.41 7.41 12.75 7 12.75ZM12 14.25C10.76 14.25 9.75 13.24 9.75 12C9.75 10.76 10.76 9.75 12 9.75C13.24 9.75 14.25 10.76 14.25 12C14.25 13.24 13.24 14.25 12 14.25ZM19 12.75H17C16.59 12.75 16.25 12.41 16.25 12C16.25 11.59 16.59 11.25 17 11.25H19C19.41 11.25 19.75 11.59 19.75 12C19.75 12.41 19.41 12.75 19 12.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg {..._props}>
      <path
        d="M11.9995 22.7501C6.91954 22.7501 2.48954 19.1401 1.46954 14.1701C1.38954 13.7601 1.64954 13.3701 2.04954 13.2801C2.45954 13.2001 2.84954 13.4601 2.93954 13.8601C3.81954 18.1401 7.62954 21.2501 11.9995 21.2501C16.3595 21.2501 20.1695 18.1601 21.0595 13.9001C21.1395 13.4901 21.5395 13.2301 21.9495 13.3201C22.3595 13.4001 22.6195 13.8001 22.5295 14.2101C21.4895 19.1501 17.0695 22.7501 11.9995 22.7501Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
      <path
        d="M21.8109 10.81C21.4609 10.81 21.1509 10.56 21.0809 10.2C20.2309 5.88001 16.4109 2.73999 12.0009 2.73999C7.62093 2.73999 3.81093 5.85 2.94093 10.13C2.86093 10.54 2.46093 10.79 2.05093 10.71C1.64093 10.63 1.38093 10.23 1.47093 9.82001C2.49093 4.85001 6.92093 1.23999 12.0009 1.23999C17.1309 1.23999 21.5609 4.89 22.5509 9.91C22.6309 10.32 22.3609 10.71 21.9609 10.79C21.9109 10.81 21.8609 10.81 21.8109 10.81Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
      <path
        d="M12 14.25C10.76 14.25 9.75 13.24 9.75 12C9.75 10.76 10.76 9.75 12 9.75C13.24 9.75 14.25 10.76 14.25 12C14.25 13.24 13.24 14.25 12 14.25ZM12 11.25C11.59 11.25 11.25 11.59 11.25 12C11.25 12.41 11.59 12.75 12 12.75C12.41 12.75 12.75 12.41 12.75 12C12.75 11.59 12.41 11.25 12 11.25Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
    </svg>
  );
}

export function SVGAdd({ variant = defaultVariant, ...props }: SVGProps) {
  const _props = {
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    ...props,
  };
  if (variant === 'bold') {
    return (
      <svg {..._props}>
        <path
          d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16 12.75H12.75V16C12.75 16.41 12.41 16.75 12 16.75C11.59 16.75 11.25 16.41 11.25 16V12.75H8C7.59 12.75 7.25 12.41 7.25 12C7.25 11.59 7.59 11.25 8 11.25H11.25V8C11.25 7.59 11.59 7.25 12 7.25C12.41 7.25 12.75 7.59 12.75 8V11.25H16C16.41 11.25 16.75 11.59 16.75 12C16.75 12.41 16.41 12.75 16 12.75Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg {..._props}>
      <path
        d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
      <path
        d="M16 12.75H8C7.59 12.75 7.25 12.41 7.25 12C7.25 11.59 7.59 11.25 8 11.25H16C16.41 11.25 16.75 11.59 16.75 12C16.75 12.41 16.41 12.75 16 12.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
      <path
        d="M12 16.75C11.59 16.75 11.25 16.41 11.25 16V8C11.25 7.59 11.59 7.25 12 7.25C12.41 7.25 12.75 7.59 12.75 8V16C12.75 16.41 12.41 16.75 12 16.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
      />
    </svg>
  );
}

export function SVGSearch({ variant = defaultVariant, ...props }: SVGProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={variant === 'bold' ? 'none' : 'currentColor'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 21l-4.486-4.494M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z" />
    </svg>
  );
}
