import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { onEscapeKey } from '../helper';
import { useIsMobile } from '../hooks';
import Modal from './Modal';

const Dropdown = ({
  className = '',
  style = {},
  target,
  children,
  aligned = 'left',
  containerStyle = {},
  onActiveChange = null,
  ...rest
}) => {
  const [active, setActive] = useState(false);
  const toggleActive = () => {
    setActive((act) => !act);
  };

  const ref = useRef(null); // .dropdown element
  const targetRef = useRef(null);
  const handleDocumentClick = (e) => {
    if (targetRef.current.contains(e.target)) return;
    const items = Array.from(ref.current.querySelectorAll('.is-non-reactive, .is-topic'));
    let nonReactive = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].contains(e.target)) {
        nonReactive = true;
        break;
      }
    }
    if (!nonReactive) setActive(false);
  };
  useEffect(() => {
    if (onActiveChange) onActiveChange(active);
    if (active) {
      document.addEventListener('click', handleDocumentClick);
      return () => {
        document.removeEventListener('click', handleDocumentClick);
      };
    }
  }, [active]);

  const menuCls = { ...style };
  if (aligned === 'left') {
    menuCls.left = '0';
  } else if (aligned === 'right') {
    menuCls.right = '0';
  } else if (aligned === 'center') {
    menuCls.left = '50%';
    menuCls.transform = 'translateX(-50%)';
  }

  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const handleModalClick = (e) => {
    let target = e.target;
    let found = false;
    while (target && !target.classList.contains('modal-dropdown')) {
      if (target.classList.contains('is-non-reactive') || target.classList.contains('is-topic')) {
        found = true;
        break;
      }
      target = target.parentElement;
    }
    if (!found) {
      setOpen(false);
    }
  };

  const renderTargetElement = () => {
    return typeof target === 'string' ? (
      <DropdownDefaultTarget>{target}</DropdownDefaultTarget>
    ) : (
      target
    );
  };

  if (isMobile) {
    return (
      <div ref={ref} className={'dropdown' + (className !== '' ? ` ${className}` : '')}>
        <div ref={targetRef} className="dropdown-target" onClick={() => setOpen(true)}>
          {renderTargetElement()}
        </div>
        <Modal open={open} onClose={() => setOpen(false)} noOuterClickClose={false}>
          <div className="modal-dropdown" onClick={handleModalClick}>
            {children}
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={
        'dropdown' + (active ? ' is-active' : '') + (className !== '' ? ` ${className}` : '')
      }
      style={containerStyle}
      {...rest}
      onKeyDown={(e) => onEscapeKey(e, () => setActive(false))}
    >
      <div
        ref={targetRef}
        role="button"
        tabIndex={0}
        className="dropdown-target"
        onClick={toggleActive}
      >
        {renderTargetElement()}
      </div>
      <div style={menuCls} className="dropdown-menu">
        {children}
      </div>
    </div>
  );
};

Dropdown.propTypes = {
  target: PropTypes.element,
  children: PropTypes.element.isRequired,
  className: PropTypes.string,
  aligned: PropTypes.oneOf(['left', 'right', 'center', 'none']),
  style: PropTypes.object,
  containerStyle: PropTypes.object,
  onActiveChange: PropTypes.func,
};

export default Dropdown;

export const DropdownDefaultTarget = ({ children }) => {
  return (
    <button className="button-with-icon is-text-first">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.9995 16.8006C11.2995 16.8006 10.5995 16.5306 10.0695 16.0006L3.54953 9.48062C3.25953 9.19062 3.25953 8.71062 3.54953 8.42063C3.83953 8.13063 4.31953 8.13063 4.60953 8.42063L11.1295 14.9406C11.6095 15.4206 12.3895 15.4206 12.8695 14.9406L19.3895 8.42063C19.6795 8.13063 20.1595 8.13063 20.4495 8.42063C20.7395 8.71062 20.7395 9.19062 20.4495 9.48062L13.9295 16.0006C13.3995 16.5306 12.6995 16.8006 11.9995 16.8006Z"
          fill="currentColor"
        />
      </svg>
      <span>{children}</span>
    </button>
  );
};

DropdownDefaultTarget.propTypes = {
  children: PropTypes.element.isRequired,
};
