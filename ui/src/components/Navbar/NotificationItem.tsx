import React, { useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { mfetchjson } from '../../helper';
import { NotificationView } from '../../serverTypes';
import {
  markNotificationAsSeen,
  notificationsDeleted,
  snackAlertError,
} from '../../slices/mainSlice';
import { ButtonMore } from '../Button';
import Dropdown from '../Dropdown';
import Image from '../Image';
import TimeAgo from '../TimeAgo';

export interface NotificationItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  notification: NotificationView;
}

// renderTitle converts the HTML title of a notification to safe/non-dangerous React elements.
const renderTitle = (title: string): React.ReactNode => {
  const doc = new DOMParser().parseFromString(title, 'text/html');
  const convert = (nodes: NodeListOf<ChildNode>): React.ReactNode[] =>
    Array.from(nodes).map((node, i) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = convert(node.childNodes);
        if (node.nodeName === 'B') {
          return <b key={i}>{children}</b>;
        }
        return <React.Fragment key={i}>{children}</React.Fragment>;
      }
      return null;
    });
  return convert(doc.body.childNodes);
};

const NotificationItem = ({ notification, ...rest }: NotificationItemProps) => {
  const { seen, createdAt } = notification;

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

  const actionsRef = useRef<HTMLDivElement>(null);
  const history = useHistory();
  const handleClick = (event: React.MouseEvent, to: string) => {
    event.preventDefault();
    const target = event.target as Node | null;
    if (
      actionsRef.current &&
      !actionsRef.current.contains(target) &&
      !document.querySelector('#modal-root')?.contains(target)
    ) {
      if (!seen) handleMarkAsSeen();
      if (to === '#') {
        return;
      }
      history.push(to, {
        fromNotifications: true,
      });
    }
  };

  const title = useMemo(() => renderTitle(notification.title), [notification.title]);
  const to = notification.toURL;
  const image = {
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
      onClick={(event) => handleClick(event, to)}
      {...rest}
    >
      <div className="notif-icon">
        <Image src={image.url} backgroundColor={image.backgroundColor} alt="" />
      </div>
      <div className="notif-body">
        <div className="notif-text">{title}</div>
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

export default NotificationItem;
