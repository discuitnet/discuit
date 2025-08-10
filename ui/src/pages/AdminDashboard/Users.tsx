import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import TimeAgo from '../../components/TimeAgo';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { User } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';

interface UsersState {
  users: User[] | null;
  next: string | null;
}

export default function Users() {
  const [loading, setLoading] = useLoading('loading');
  const [usersState, setUsersState] = useState<UsersState>({ users: null, next: null });

  const dispatch = useDispatch();
  useEffect(() => {
    const f = async () => {
      try {
        const res = await fetchUsers();
        setUsersState(res);
        setLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setLoading('error');
      }
    };
    f();
  }, []);

  const [nextUsersLoading, setNextUsersLoading] = useState(false);
  const fetchNextUsers = async () => {
    if (nextUsersLoading || !usersState.next) return;
    try {
      setNextUsersLoading(true);
      const res = await fetchUsers(usersState.next);
      setUsersState((prev) => {
        return {
          users: [...prev.users!, ...(res.users || [])],
          next: res.next,
        };
      });
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setNextUsersLoading(false);
    }
  };

  const handleRenderItem = (item: User) => {
    const user = item;
    return (
      <TableRow columns={5}>
        <Link className="table-column" to={`/@${user.username}`}>
          @{user.username}
        </Link>
        <div className="table-column" style={{ color: 'red' }}>
          {user.isBanned ? 'Banned' : user.deleted ? 'Deleted' : ''}
        </div>
        <TimeAgo className="table-column" time={user.createdAt} />
        <div className="table-column">
          {user.createdIP}
        </div>
        <div className="table-column">
          {user.lastSeenIP}
        </div>
      </TableRow>
    );
  };

  const handleRenderHead = () => {
    return (
      <TableRow columns={5} head>
        <div className="table-column">Username</div>
        <div className="table-column">Deleted</div>
        <div className="table-column">Created at</div>
        <div className="table-column">Created IP</div>
        <div className="table-column">Last IP</div>
      </TableRow>
    );
  };

  if (loading !== 'loaded') {
    return <PageLoading />;
  }

  const feedItems: SimpleFeedItem<User>[] = [];
  usersState.users!.forEach((user) => feedItems.push({ item: user, key: user.id }));

  return (
    <div className="dashboard-page-users document">
      <div className="dashboard-page-title">Users</div>
      <div className="dashboard-page-content">
        <SimpleFeed
          className="table"
          items={feedItems}
          onRenderItem={handleRenderItem}
          onRenderHead={handleRenderHead}
        />
        <Button className="is-more-button" loading={nextUsersLoading} onClick={fetchNextUsers}>
          More
        </Button>
      </div>
    </div>
  );
}

async function fetchUsers(next?: string): Promise<UsersState> {
  return mfetchjson('/api/users' + (next ? `?next=${next}` : ''));
}
