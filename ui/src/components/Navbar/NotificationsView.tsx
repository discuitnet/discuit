import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useDispatch, useSelector } from 'react-redux';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { NotificationType, NotificationView } from '../../serverTypes';
import {
  MainState,
  notificationsAllDeleted,
  notificationsAllSeen,
  notificationsLoaded,
  notificationsNewCountReset,
  notificationsUpdated,
  snackAlert,
  snackAlertError,
} from '../../slices/mainSlice';
import { RootState } from '../../store';
import { ButtonMore } from '../Button';
import Dropdown from '../Dropdown';
import NotificationItem from './NotificationItem';

const NotificationsView = () => {
  const notifications = useSelector<RootState>(
    (state) => state.main.notifications
  ) as MainState['notifications'];
  const { loaded, next, count, newCount } = notifications;
  const items = notifications.items as NotificationView[];

  const dispatch = useDispatch();
  const apiEndpoint = '/api/notifications?render=true&format=html';

  /**
   *
   * @param type - The type of the notifications to be marked as seen. Empty
   * string captures all notifications.
   */
  const markAsSeen = async (type: NotificationType | '' = '') => {
    const res = await mfetch(`${apiEndpoint}&action=markAllAsSeen&type=${type}`, {
      method: 'POST',
    });
    if (!res.ok) throw new APIError(res.status, await res.text());
    return res;
  };

  useEffect(() => {
    if (loaded && newCount === 0) return;
    (async () => {
      try {
        dispatch(notificationsLoaded(await mfetchjson(apiEndpoint)));
        const res = await mfetch(`${apiEndpoint}&action=resetNewCount`, { method: 'POST' });
        if (!res.ok) throw new APIError(res.status, await res.text());
        dispatch(notificationsNewCountReset());
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [loaded, newCount, dispatch]);

  const [ref, inView] = useInView();
  const nextItemsLoading = useRef(false);
  useEffect(() => {
    if (inView) {
      if (nextItemsLoading.current === true) return;
      (async () => {
        try {
          nextItemsLoading.current = true;
          dispatch(notificationsUpdated(await mfetchjson(`${apiEndpoint}&next=${next}`)));
        } catch (error) {
          dispatch(snackAlertError(error));
        } finally {
          nextItemsLoading.current = false;
        }
      })();
    }
  }, [inView, next, dispatch]);

  const handleMarkAllAsSeen = async (type: NotificationType | '' = '') => {
    try {
      await markAsSeen(type);
      dispatch(notificationsAllSeen(type));
      let text = 'All notifications are marked as seen.';
      if (type === 'new_votes') text = 'All upvote notifications are marked as seen.';
      dispatch(snackAlert(text, 'notifs_marked_seen'));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };
  const handleDeleteAll = async () => {
    try {
      const res = await mfetch(`${apiEndpoint}&action=deleteAll`, {
        method: 'POST',
      });
      if (!res.ok) throw new APIError(res.status, await res.text());
      dispatch(notificationsAllDeleted());
      dispatch(snackAlert('All notifications are deleted.', 'all_notifs_deleted'));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const className = 'notifs is-custom-scrollbar is-v2 is-non-reactive';
  if (!loaded) {
    const renderSkeletons = () => {
      const items = [];
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
