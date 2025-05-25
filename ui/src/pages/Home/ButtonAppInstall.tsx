import { useState } from 'react';
import { ButtonClose } from '../../components/Button';
import Modal from '../../components/Modal';

export type DeferredInstallPrompt = {
  prompt: () => void;
};

export interface ButtonAppInstallProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  deferredPrompt: DeferredInstallPrompt;
  children: React.ReactNode;
}

const ButtonAppInstall = ({ deferredPrompt, children, ...props }: ButtonAppInstallProps) => {
  const [showIosModal, setShowIosModal] = useState(false);
  const handleIosModalClose = () => setShowIosModal(false);

  const handleClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      // show iOS modal
      setShowIosModal(true);
    }
  };

  return (
    <>
      <button {...props} onClick={handleClick}>
        {children}
      </button>
      <Modal open={showIosModal} onClose={handleIosModalClose}>
        <div className="modal-card is-compact-mobile modal-ios-install">
          <div className="modal-card-head">
            <div className="modal-card-title">Steps to install</div>
            <ButtonClose onClick={handleIosModalClose} />
          </div>
          <div className="modal-card-content">
            <div className="modal-ios-install-steps">
              <ol>
                <li>1. Tap on the Safari share button.</li>
                <li>{`2. Tap on "Add to Home Screen."`}</li>
                <li>{`3. Tap on "Add."`}</li>
              </ol>
              <p>Note that web apps on iOS can only be installed using Safari.</p>
            </div>
          </div>
          <div className="modal-card-actions">
            <button onClick={handleIosModalClose}>Close</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ButtonAppInstall;
