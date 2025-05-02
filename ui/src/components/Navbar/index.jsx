import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '../../hooks';
import DefaultNavbar from './DefaultNavbar';
import GoBackNavbar from './GoBackNavbar';

const Navbar = ({ offline = false }) => {
  // Only enable background blur when scrolled down.
  const supportsBlur = () => window.CSS && window.CSS.supports('backdrop-filter', 'blur(10px)');
  const [blur, setBlur] = useState(supportsBlur() && window.scrollY > 50);
  const blurRef = useRef(blur);
  const navbarRef = useRef();
  useEffect(() => {
    if (supportsBlur()) {
      const listner = () => {
        if (window.scrollY > 50) {
          if (blurRef.current !== true) {
            blurRef.current = true;
            setBlur(true);
          }
        } else {
          if (blurRef.current !== false) {
            blurRef.current = false;
            setBlur(false);
          }
        }
      };
      window.addEventListener('scroll', listner, { passive: true });
      return () => window.removeEventListener('scroll', listner);
    }
  }, []);

  const [bottomNavbarNavigation, setBottomNavbarNavigation] = useState(true);

  const location = useLocation();
  useEffect(() => {
    setBottomNavbarNavigation(Boolean(location.state && location.state.fromBottomNav));
  }, [location]);

  const isMobile = useIsMobile();

  const renderGoBackNavbar = isMobile && !bottomNavbarNavigation && location.pathname !== '/';

  // <header className={'navbar' + (blur ? ' is-blured' : '')} ref={navbarRef}></header>
  return (
    <header
      className={clsx('navbar', blur && 'is-blured', renderGoBackNavbar && 'is-go-back')}
      ref={navbarRef}
    >
      <div className="wrap">
        {renderGoBackNavbar ? <GoBackNavbar /> : <DefaultNavbar offline={offline} />}
      </div>
    </header>
  );
};

Navbar.propTypes = {
  offline: PropTypes.bool,
};

export default Navbar;
