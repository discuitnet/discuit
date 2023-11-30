/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { getScrollbarWidth } from '../../helper';
import { useHistory } from 'react-router-dom';

const Modal = ({
  open,
  onClose,
  noEscapeClose = false,
  noOuterClickClose = false,
  children,
  onKeyDown,
}) => {
  const history = useHistory();
  // const isMobile = useIsMobile();
  // useLayoutEffect(() => {
  //   if (open) {
  //     if (isMobile) history.push(history.location);
  //     const unlisten = history.listen((location, action) => {
  //       if (action === 'POP') {
  //         onClose();
  //       }
  //     })
  //     return () => {
  //       unlisten();
  //     }
  //   }
  // }, [open])

  useEffect(() => {
    if (open) {
      const unlisten = history.listen((location, action) => {
        if (action === 'POP') onClose();
      });
      return () => unlisten();
    }
  }, [open]);

  const [el] = useState(document.createElement('el'));
  useEffect(() => {
    document.getElementById('modal-root').appendChild(el);
    return () => {
      document.getElementById('modal-root').removeChild(el);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (!noEscapeClose && e.key === 'Escape') onClose();
    if (onKeyDown) onKeyDown(e);
  };
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  useLayoutEffect(() => {
    const width = getScrollbarWidth();
    const navbarEl = document.querySelector('.navbar');
    if (open) {
      document.body.classList.add('is-clipped');
      // Scrollbar always visible now
      // if (isScrollbarVisible()) {
      document.body.style.paddingRight = `${width}px`;
      if (navbarEl) {
        navbarEl.style.paddingRight = `${width}px`;
      }
      // }
    }
    return () => {
      if (open) {
        document.body.classList.remove('is-clipped');
        document.body.style.paddingRight = '0';
        if (navbarEl) {
          navbarEl.style.paddingRight = `0`;
        }
      }
    };
  });

  const handleBgClick = (e) => {
    if (!noOuterClickClose && e.target.classList.contains('modal-bg')) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal" onClick={handleBgClick}>
      <div className="modal-container">
        <div className="modal-modal">{children}</div>
        <div className="modal-bg"></div>
      </div>
    </div>,
    el
  );
};

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  noEscapeClose: PropTypes.bool,
  noOuterClickClose: PropTypes.bool,
  children: PropTypes.element.isRequired,
  onKeyDown: PropTypes.func,
};

export default Modal;
