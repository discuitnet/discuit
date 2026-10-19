import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import DashboardPage from '../../components/Dashboard/DashboardPage';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { printDate } from '../../helper';
import { snackAlertError } from '../../slices/mainSlice';


interface RequestPasswordRecord {
  username: string;
  ip: string;
  createdAt: string;
}

interface Row {
  username: string;
  ip: string;
  createdAt: Date;
}

interface APIReponse {
  events: RequestPasswordRecord[];
  maxId: string;
}

export default function RequestPasswordLogs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [maxId, setMaxId] = useState('');
  const [loading, setLoading] = useLoading('loading');

  const dispatch = useDispatch();
  const fetchEvents = async (maxId = '') => {
    const limit = 250;
    try {
      const res = (await mfetchjson(`/api/request_password_logs?limit=${limit}&maxId=${maxId}`)) as APIReponse;
      const items = res.events.map((event) => {
        return {
          username: event.username,
          ip: event.ip,
          createdAt: new Date(event.createdAt),
        } as Row;
      });
      setRows((rows) => [...rows, ...items]);
      setMaxId(res.maxId);
      setLoading('loaded');
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFetchMore = () => fetchEvents(maxId);

  const handleRenderItem = (item: Row) => {
    return (
      <TableRow columns={3}>
        <div className="table-column">{printDate(item.createdAt)}</div>
        <div className="table-column">{item.username}</div>
        <div className="table-column">{item.ip}</div>
      </TableRow>
    );
  };

  const handleRenderHead = () => {
    return (
      <TableRow columns={3} head>
        <div className="table-column">Timestamp (UTC)</div>
        <div className="table-column">Requested username</div>
        <div className="table-column">Request IP</div>
      </TableRow>
    );
  };

  if (loading !== 'loaded') {
    return <PageLoading />;
  }

  const feedItems: SimpleFeedItem<Row>[] = [];
  rows?.forEach((row) => feedItems.push({ item: row, key: row.createdAt.toString() }));

  return (
    <DashboardPage className="document" title="Password reset requests" fullWidth>
      <SimpleFeed
        className="table"
        items={feedItems}
        onRenderItem={handleRenderItem}
        onRenderHead={handleRenderHead}
        hasMore={Boolean(maxId)}
        onFetchMore={handleFetchMore}
      />
    </DashboardPage>
  );
}
