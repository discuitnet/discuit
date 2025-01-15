import { useEffect, useState } from 'react';
import { ButtonClose } from './components/Button';
import Modal from './components/Modal';
import { useIsMobile } from './hooks';

export async function forceSwUpdate() {
  if ('serviceWorker' in navigator) {
    console.log('Force updating service worker');
    const registration = await navigator.serviceWorker.ready;
    return registration.update();
  }
}

function AppUpdate() {
  const [serviceWorkerWaiting, setServiceWorkerWaiting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => forceSwUpdate(), 1000 * 60 * 2); // every 2 minutes
    const listener = async () => {
      if (!document.hidden) await forceSwUpdate();
    };
    document.addEventListener('visibilitychange', listener);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', listener);
    };
  }, []);

  useEffect(() => {
    let effectCancelled = false;
    const detectSwUpdate = async () => {
      const registration = await navigator.serviceWorker.ready;
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state == 'installed') {
              if (!effectCancelled) {
                setServiceWorkerWaiting(true);
              }
            }
          });
        }
      });
    };
    if ('serviceWorker' in navigator) {
      detectSwUpdate();
    }
    return () => {
      effectCancelled = true;
    };
  }, []);

  const handleReload = async () => {
    window.location.reload();
  };

  const [modalOpen, setModalOpen] = useState(true);
  const handleClose = () => setModalOpen(false);
  const isMobile = useIsMobile();

  const [showPrompt, setShowPrompt] = useState(false);
  useEffect(() => {
    if (showPrompt) {
      updateLocalStoragePromptDisplayedTimestamp();
      return;
    }
    if (serviceWorkerWaiting) {
      const timer = window.setInterval(() => {
        const show = isMobile && shouldDisplayUpdatePrompt();
        setShowPrompt(show);
        if (show) {
          clearInterval(timer);
        }
      }, 10000);
      return () => {
        clearInterval(timer);
      };
    } else {
      setShowPrompt(false);
    }
  }, [showPrompt, serviceWorkerWaiting, isMobile]);

  if (showPrompt) {
    /*
    return (
      <div style={{ marginTop: 'var(--navbar-height)' }}>
        <button className="button-main" onClick={handleReload}>
          Reload
        </button>
      </div>
    );
    */
    return (
      <Modal open={modalOpen} onClose={handleClose} noOuterClickClose>
        <div className="modal-card is-compact-mobile is-center" style={{ minWidth: '300px' }}>
          <div className="modal-card-head">
            <div className="modal-card-title">Update available!</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="modal-card-content">
            <p>
              A new version of this app is available. Reload the page to update. It won&apos;t take
              more than a second.
            </p>
          </div>
          <div className="modal-card-actions">
            <button className="button-main" onClick={handleReload}>
              Reload
            </button>
            <button onClick={handleClose}>Not now</button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}

const localStorageKey = 'update_prompt_displayed_at';

/**
 * Returns true if the update prompt has not been displayed to the user in the
 * last 20 minutes.
 *
 * @returns booleon
 */
function shouldDisplayUpdatePrompt() {
  const val = window.localStorage.getItem(localStorageKey);
  if (val === null) {
    return true;
  }
  const valInt = parseInt(val, 10);
  if (isNaN(valInt)) {
    return true;
  }
  const current = Date.now() / 1000;
  return current - valInt > 20 * 60;
}

function updateLocalStoragePromptDisplayedTimestamp() {
  window.localStorage.setItem(localStorageKey, Math.round(Date.now() / 1000).toString());
}

export default AppUpdate;
