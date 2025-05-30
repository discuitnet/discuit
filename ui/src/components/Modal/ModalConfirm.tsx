import PropTypes from 'prop-types';
import React from 'react';
import Modal from '.';
import { ButtonClose } from '../Button';

export interface ModalConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  yesText?: string;
  noText?: string;
  children: React.ReactNode;
  disableEnter?: boolean;
}

const ModalConfirm = ({
  open,
  onClose,
  onConfirm,
  title,
  yesText = 'Yes',
  noText = 'No',
  children,
  disableEnter = false,
}: ModalConfirmProps) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!disableEnter && event.key === 'Enter') {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-card is-compact-mobile is-center">
        <div className="modal-card-head">
          <div className="modal-card-title">{title}</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">{children}</div>
        <div className="modal-card-actions">
          <button className="button-main" onClick={onConfirm}>
            {yesText}
          </button>
          <button onClick={onClose}>{noText}</button>
        </div>
      </div>
    </Modal>
  );
};

ModalConfirm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  yesText: PropTypes.string,
  noText: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  disableEnter: PropTypes.bool,
};

export default ModalConfirm;
