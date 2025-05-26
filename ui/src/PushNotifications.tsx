import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ButtonClose } from './components/Button';
import Modal from './components/Modal';
import { mfetchjson, urlBase64ToUint8Array } from './helper';
import { useIsMobile } from './hooks';
import { MainState } from './slices/mainSlice';
import { RootState } from './store';

const timestampKey = 'notifPermsLastAskedAt';

export const shouldAskForNotificationsPermissions = (
  loggedIn: boolean,
  applicationServerKey: string | null,
  considerLastAsked = true
) => {
  if (!(loggedIn && applicationServerKey)) return false;
  if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window))
    return false;

  if (Notification.permission === 'granted') return false;

  if (considerLastAsked) {
    const ts = parseInt(localStorage.getItem(timestampKey) || '', 10);
    if (!isNaN(ts)) {
      const current = Math.round(Date.now() / 1000);
      if (current - ts > 3600 * 24 * 30) {
        return true;
      } else {
        return false;
      }
    }
  }

  return true;
};

export const clearNotificationsLocalStorage = () => {
  localStorage.removeItem(timestampKey);
};

const updatePushSubscription = async (loggedIn: boolean, applicationServerKey: string) => {
  if (!(loggedIn && applicationServerKey)) return;
  if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;

    // It's okay to call pushManager.subscribe more than once.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
    });

    // Send subscription to server. Always do this. User could be using
    // multiple accounts on this session, which will all use the same
    // PushSubscription.
    await mfetchjson('/api/push_subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });

    console.log('Push subscription updated.');
  } catch (error) {
    console.error(error);
  }
};

// Gets device notification permissions and sends the PushSubscription to the
// server for persistence.
export const getNotificationsPermissions = async (
  loggedIn: boolean,
  applicationServerKey: string
) => {
  if (!(loggedIn && applicationServerKey)) return;
  if (!('serviceWorker' in navigator && 'PushManager' in window)) return;

  if (Notification.permission !== 'granted') {
    if ((await Notification.requestPermission()) !== 'granted') {
      alert("It looks like your browser doesn't support push notifications.");
      return;
    }
  }

  updatePushSubscription(loggedIn, applicationServerKey);
};

const PushNotifications = () => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  const applicationServerKey = useSelector<RootState>(
    (state) => state.main.vapidPublicKey
  ) as MainState['vapidPublicKey'];

  const isMobile = useIsMobile(true);

  const [askModalOpen, setAskModalOpen] = useState(false);
  const handleAskModalClose = () => setAskModalOpen(false);

  useEffect(() => {
    if (isMobile && applicationServerKey) {
      setAskModalOpen(shouldAskForNotificationsPermissions(loggedIn, applicationServerKey));
      if (window.Notification && Notification.permission === 'granted') {
        updatePushSubscription(loggedIn, applicationServerKey);
      }
    }
  }, [loggedIn, applicationServerKey, isMobile]);

  useEffect(() => {
    if (askModalOpen) {
      return () => localStorage.setItem(timestampKey, Math.round(Date.now() / 1000).toString());
    }
  }, [askModalOpen]);

  const handlePermissionsAsk = async () => {
    if (applicationServerKey) {
      await getNotificationsPermissions(loggedIn, applicationServerKey);
      handleAskModalClose();
    }
  };

  return (
    <Modal open={askModalOpen} onClose={handleAskModalClose} noOuterClickClose>
      <div className="modal-card is-compact-mobile is-center">
        <div className="modal-card-head">
          <div className="modal-card-title">Turn on notifications</div>
          <ButtonClose onClick={handleAskModalClose} />
        </div>
        <div className="modal-card-content">
          To receive notifications when someone comments on your post or likes it, turn on push
          notifications.
        </div>
        <div className="modal-card-actions">
          <button className="button-main" onClick={handlePermissionsAsk}>
            Turn on
          </button>
          <button onClick={handleAskModalClose}>Not now</button>
        </div>
      </div>
    </Modal>
  );
};

export default PushNotifications;
