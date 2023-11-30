import React from 'react';
import { useSelector } from 'react-redux';
import { ButtonNotifications } from '../Button';
import Dropdown from '../Dropdown';
import NotificationsView from './NotificationsView';

const Notifications = () => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  // const notifs = useSelector((state) => state.main.notifications);

  // const handleActiveChange = async (open) => {
  //   setOpen(open);
  //   // if (open && notifs.newCount > 0) {
  //   //   try {
  //   //     const res = await mfetch(`/api/notifications?action=resetNewNotificationsCount`, {
  //   //       method: 'POST',
  //   //     });
  //   //     if (!res.ok) {
  //   //       throw new APIError(res.status, await res.json());
  //   //     }
  //   //     dispatch(notificationsNewCountReset());
  //   //   } catch (error) {
  //   //     console.error(error);
  //   //   }
  //   // }
  // };

  if (!loggedIn) {
    return null;
  }

  return (
    <Dropdown
      className="notifications"
      aligned="none"
      target={<ButtonNotifications count={user.newNotificationsCount} />}
    >
      <NotificationsView />
    </Dropdown>
  );
};

export default Notifications;
