import React, { useEffect, useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useHistory } from 'react-router-dom';
import { getScrollbarWidth } from '../../helper';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  noEscapeClose?: false;
  noOuterClickClose?: false;
  children: React.ReactNode;
  onKeyDown: (event: KeyboardEvent) => void;
}

const Modal = ({
  open,
  onClose,
  noEscapeClose = false,
  noOuterClickClose = false,
  children,
  onKeyDown,
}: ModalProps) => {
  const history = useHistory();

  useEffect(() => {
    if (open) {
      const unlisten = history.listen((_, action) => {
        if (action === 'POP') onClose();
      });
      return () => unlisten();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, history]);

  const [el] = useState(document.createElement('el'));
  useEffect(() => {
    document.getElementById('modal-root')?.appendChild(el);
    return () => {
      document.getElementById('modal-root')?.removeChild(el);
    };
  }, [el]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!noEscapeClose && event.key === 'Escape') onClose();
      if (onKeyDown) onKeyDown(event);
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    const width = getScrollbarWidth();
    const navbarEl = document.querySelector('.navbar');
    if (open) {
      document.body.classList.add('is-clipped');
      document.body.style.paddingRight = `${width}px`;
      if (navbarEl instanceof HTMLElement) {
        navbarEl.style.paddingRight = `${width}px`;
      }
    }
    return () => {
      if (open) {
        document.body.classList.remove('is-clipped');
        document.body.style.paddingRight = '0';
        if (navbarEl instanceof HTMLElement) {
          navbarEl.style.paddingRight = `0`;
        }
      }
    };
  });

  const handleBackgroundClick = (event: React.MouseEvent) => {
    const target = event.target as Element;
    if (!noOuterClickClose && target.classList.contains('modal-bg')) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal" onClick={handleBackgroundClick}>
      <div className="modal-container">
        <div className="modal-modal">{children}</div>
        <div className="modal-bg"></div>
      </div>
    </div>,
    el
  );
};

export default Modal;
