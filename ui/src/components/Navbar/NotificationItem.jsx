import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { mfetchjson } from '../../helper';
import {
  markNotificationAsSeen,
  notificationsDeleted,
  snackAlertError,
} from '../../slices/mainSlice';
import { ButtonMore } from '../Button';
import Dropdown from '../Dropdown';
import Image from '../Image';
import TimeAgo from '../TimeAgo';

const NotificationItem = ({ notification, ...rest }) => {
  const { seen, createdAt, notif } = notification;
  // const viewer = useSelector((state) => state.main.user);

  const [actionBtnHovering, setActionBtnHovering] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false);

  const dispatch = useDispatch();
  const handleMarkAsSeen = () => dispatch(markNotificationAsSeen(notification, !seen));
  const handleDelete = async () => {
    try {
      await mfetchjson(`/api/notifications/${notification.id}?render=true&format=html`, {
        method: 'DELETE',
      });
      dispatch(notificationsDeleted(notification));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const actionsRef = useRef();
  const history = useHistory();
  const handleClick = (event, to) => {
    event.preventDefault();
    if (
      !actionsRef.current.contains(event.target) &&
      !document.querySelector('#modal-root').contains(event.target)
    ) {
      if (!seen) handleMarkAsSeen();
      history.push(to, {
        fromNotifications: true,
      });
    }
  };

  if (notif === null) {
    return (
      <div className="notif" style={{ cursor: 'initial' }}>
        <div className="notif-icon"></div>
        <div className="notif-body">Error rendering notification item</div>
      </div>
    );
  }

  let html = { __html: notification.title };
  let to = notification.toURL;
  let image = {
    url: notification.icons[0],
    backgroundColor: 'transparent',
  };

  return (
    <a
      href={to}
      className={
        'link-reset notif' +
        (seen ? ' is-seen' : '') +
        (actionBtnHovering ? ' is-btn-hovering' : '')
      }
      onClick={(e) => handleClick(e, to)}
      {...rest}
    >
      <div className="notif-icon">
        <Image src={image.url} backgroundColor={image.backgroundColor} alt="" />
      </div>
      <div className="notif-body">
        <div className="notif-text" dangerouslySetInnerHTML={html}></div>
        <div className="notif-time">
          <TimeAgo time={createdAt} inline={false} />
        </div>
      </div>
      <div
        ref={actionsRef}
        className={'notif-action-btn' + (dropdownActive ? ' is-active' : '')}
        onMouseEnter={() => setActionBtnHovering(true)}
        onMouseLeave={() => setActionBtnHovering(false)}
      >
        <Dropdown
          target={<ButtonMore />}
          aligned="right"
          onActiveChange={(active) => setDropdownActive(active)}
        >
          <div className="dropdown-list">
            <button className="button-clear dropdown-item" onClick={handleMarkAsSeen}>
              {`Mark as ${seen ? 'un' : ''}seen`}
            </button>
            <button className="button-clear dropdown-item" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </Dropdown>
      </div>
    </a>
  );
};

NotificationItem.propTypes = {
  notification: PropTypes.object.isRequired,
};

export default NotificationItem;
