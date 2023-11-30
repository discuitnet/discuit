/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useEscapeKeydown, useIsMobile } from '../hooks';
import Modal from './Modal';
import { onEscapeKey } from '../helper';

const Dropdown = ({
  className = '',
  style = {},
  target,
  children,
  aligned = 'left',
  containerStyle = {},
  onActiveChange,
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

  if (isMobile) {
    return (
      <div ref={ref} className={'dropdown' + (className !== '' ? ` ${className}` : '')}>
        <div ref={targetRef} className="dropdown-target" onClick={() => setOpen(true)}>
          {target}
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
        {target}
      </div>
      <div style={menuCls} className="dropdown-menu">
        {children}
      </div>
    </div>
  );
};

Dropdown.propTypes = {
  target: PropTypes.element.isRequired,
  children: PropTypes.element.isRequired,
  className: PropTypes.string,
  aligned: PropTypes.oneOf(['left', 'right', 'center', 'none']),
  style: PropTypes.object,
  containerStyle: PropTypes.object,
  onActiveChange: PropTypes.func,
};

export default Dropdown;
