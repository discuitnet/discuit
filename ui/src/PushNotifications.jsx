import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Modal from './components/Modal';
import { ButtonClose } from './components/Button';
import { mfetchjson, urlBase64ToUint8Array } from './helper';
import { useIsMobile } from './hooks';

function askDeviceNotificationsPermissions() {
  return new Promise(function (resolve, reject) {
    const permissionResult = Notification.requestPermission(function (result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  }).then(function (permissionResult) {
    if (permissionResult !== 'granted') {
      throw new Error("We weren't granted permission.");
    }
  });
}

const timestampKey = 'notifPermsLastAskedAt';

export const shouldAskForNotificationsPermissions = (
  loggedIn,
  applicationServerKey,
  considerLastAsked = true
) => {
  if (!(loggedIn && applicationServerKey)) return false;
  if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window))
    return false;

  if (Notification.permission === 'granted') return false;

  if (considerLastAsked) {
    const ts = parseInt(localStorage.getItem(timestampKey), 10);
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

const updatePushSubscription = async (loggedIn, applicationServerKey) => {
  if (!(loggedIn && applicationServerKey)) return;
  if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;

    // It's okay to call pushManager.subscribe more than once.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
    });

    console.log(subscription);

    // Send subscription to server. Always do this. User could be using
    // multiple accounts on this session, which will all use the same
    // PushSubscription.
    const res = await mfetchjson('/api/push_subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });

    console.log(res);
  } catch (error) {
    console.error(error);
  }
};

// Gets device notification permissions and sends the PushSubscription to the
// server for persistence.
export const getNotificationsPermissions = async (loggedIn, applicationServerKey) => {
  if (!(loggedIn && applicationServerKey)) return;
  if (!('serviceWorker' in navigator && 'PushManager' in window)) return;

  let canNotify = Notification.permission === 'granted';

  if (!canNotify) {
    try {
      await askDeviceNotificationsPermissions();
      canNotify = true;
    } catch (error) {
      alert("It looks like your browser doesn't support push notifications.");
    }
  }

  if (canNotify) updatePushSubscription(loggedIn, applicationServerKey);
};

const PushNotifications = () => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const applicationServerKey = useSelector((state) => state.main.vapidPublicKey);

  const isMobile = useIsMobile();

  const [askModalOpen, setAskModalOpen] = useState(false);
  const handleAskModalClose = () => setAskModalOpen(false);

  useEffect(() => {
    if (isMobile) {
      setAskModalOpen(shouldAskForNotificationsPermissions(loggedIn, applicationServerKey));
      if (window.Notification && Notification.permission === 'granted') {
        updatePushSubscription(loggedIn, applicationServerKey);
      }
    }
  }, [loggedIn, applicationServerKey, isMobile]);

  useEffect(() => {
    if (askModalOpen) {
      return () => localStorage.setItem(timestampKey, Math.round(Date.now() / 1000));
    }
  }, [askModalOpen]);

  const handlePermissionsAsk = async () => {
    await getNotificationsPermissions(loggedIn, applicationServerKey);
    handleAskModalClose();
  };

  return (
    <Modal open={askModalOpen} onClose={handleAskModalClose} noOuterClickClose>
      <div className="modal-card is-compact-mobile">
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
