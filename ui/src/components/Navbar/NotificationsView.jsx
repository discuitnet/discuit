import React, { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useDispatch, useSelector } from 'react-redux';
import { APIError, mfetch, mfetchjson } from '../../helper';
import {
  notificationsAllDeleted,
  notificationsAllSeen,
  notificationsLoaded,
  notificationsNewCountReset,
  notificationsUpdated,
  snackAlert,
  snackAlertError,
} from '../../slices/mainSlice';
import { ButtonMore } from '../Button';
import Dropdown from '../Dropdown';
import NotificationItem from './NotificationItem';

const NotificationsView = () => {
  const notifications = useSelector((state) => state.main.notifications);
  const { loaded, next, items, count, newCount } = notifications;

  const dispatch = useDispatch();

  // type is the type of notifications. Empty string means all notifications.
  const markAsSeen = async (type = '') => {
    const res = await mfetch(`/api/notifications?action=markAllAsSeen&type=${type}`, {
      method: 'POST',
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res;
  };

  const apiEndpoint = '/api/notifications';
  useEffect(() => {
    if (loaded && newCount === 0) return;
    (async () => {
      try {
        dispatch(notificationsLoaded(await mfetchjson(apiEndpoint)));

        const res = await mfetch(`/api/notifications?action=resetNewCount`, { method: 'POST' });
        if (!res.ok) throw new APIError(res.status, await res.text());

        dispatch(notificationsNewCountReset());

        // Mark upvote notifications as seen.
        // let voteNotifsMarked = false;
        // (async () => {
        //   try {
        //     await markAsSeen('new_votes');
        //     voteNotifsMarked = true;
        //   } catch (error) {
        //     console.error(error);
        //   }
        // })();
        // return () => voteNotifsMarked && dispatch(notificationsAllSeen('new_votes'));
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [loaded]);

  const [ref, inView] = useInView();
  const nextItemsLoading = useRef(false);
  useEffect(() => {
    if (inView) {
      if (nextItemsLoading.current === true) return;
      (async () => {
        try {
          nextItemsLoading.current = true;
          dispatch(notificationsUpdated(await mfetchjson(`${apiEndpoint}?next=${next}`)));
        } catch (error) {
          dispatch(snackAlertError(error));
        } finally {
          nextItemsLoading.current = false;
        }
      })();
    }
  }, [inView]);

  // Don't pass this function as is to an event handler because then type will
  // be set to e.
  const handleMarkAllAsSeen = async (type = '') => {
    try {
      await markAsSeen(type);
      dispatch(notificationsAllSeen(type));

      let text = 'All notifications are marked as seen.';
      if (type === 'new_votes') text = 'All upvote notifications are marked as seen.';
      dispatch(snackAlert(text));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };
  const handleDeleteAll = async () => {
    try {
      const res = await mfetch(`/api/notifications?action=deleteAll`, { method: 'POST' });
      if (!res.ok) throw new APIError(res.status, await res.text());
      dispatch(notificationsAllDeleted());
      dispatch(snackAlert('All notifications are deleted.'));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const className = 'notifs is-custom-scrollbar is-v2 is-non-reactive';
  if (!loaded) {
    const renderSkeletons = () => {
      let items = [];
      for (let i = 0; i < 10; i++)
        items.push(
          <div className="notif-skeleton" key={i}>
            <div className="skeleton-bar"></div>
          </div>
        );
      return items;
    };
    return (
      <div className={className}>
        <div className="notifs-head">
          <div className="notifs-title">Notifications</div>
        </div>
        <div className="notifs-body">
          <div className="notifs-list">{renderSkeletons()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="notifs-head">
        <div className="notifs-title">Notifications</div>
        {count > 0 && (
          <Dropdown target={<ButtonMore />} aligned="right">
            <div className="dropdown-list">
              <button className="button-clear dropdown-item" onClick={() => handleMarkAllAsSeen()}>
                Mark all as seen
              </button>
              <button
                className="button-clear dropdown-item"
                onClick={() => handleMarkAllAsSeen('new_votes')}
              >
                Mark all upvotes as seen
              </button>
              <button className="button-clear dropdown-item" onClick={handleDeleteAll}>
                Delete all
              </button>
            </div>
          </Dropdown>
        )}
      </div>
      <div className="notifs-body">
        {count === 0 && (
          <div className="notifs-empty">
            <p>No notifications</p>
          </div>
        )}
        <div className="notifs-list">
          {items.map((item, index) => (
            <NotificationItem key={item.id} notification={item} style={{ zIndex: 10000 - index }} />
          ))}
          {next && (
            <>
              <div ref={ref} className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
