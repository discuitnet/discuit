import { useSelector } from 'react-redux';
import { MainState } from '../../slices/mainSlice';
import { RootState } from '../../store';
import { ButtonNotifications } from '../Button';
import Dropdown from '../Dropdown';
import NotificationsView from './NotificationsView';

const Notifications = () => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  if (!loggedIn) {
    return null;
  }

  return (
    <Dropdown
      className="notifications"
      aligned="none"
      target={<ButtonNotifications count={user.notificationsNewCount} />}
    >
      <NotificationsView />
    </Dropdown>
  );
};

export default Notifications;
