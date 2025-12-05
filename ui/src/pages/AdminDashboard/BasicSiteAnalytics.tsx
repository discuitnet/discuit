import { useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetchjson } from '../../helper';
import { useIsMobile, useLoading } from '../../hooks';
import { AnalyticsEvent } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';

interface BasicSiteStats {
  version: number;
  users_day: number;
  users_week: number;
  users_month: number;
  return_users_day: number;
  return_users_week: number;
  return_users_month: number;
  signups: number;
  pwa_installs: number;
  notifications_enabled: number;
  posts_day: number;
  posts_week: number;
  comments_day: number;
  comments_week: number;
}

interface Row {
  stat: BasicSiteStats;
  createdAt: Date;
}

interface APIReponse {
  events: AnalyticsEvent[];
  next: string;
}

function printDate(date: Date): string {
  // return timeAgo(date);
  // return date.toLocaleString()
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}-${date.getUTCMinutes()}`;
}

export default function BasicSiteAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [next, setNext] = useState('');
  const [loading, setLoading] = useLoading('loading');

  const dispatch = useDispatch();
  const fetchEvents = async (next = '') => {
    try {
      const res = (await mfetchjson(`/api/analytics/bss?next=${next}`)) as APIReponse;
      const items = res.events.map((event) => {
        return {
          stat: JSON.parse(event.payload) as BasicSiteStats,
          createdAt: new Date(event.createdAt),
        } as Row;
      });
      setRows((rows) => [...rows, ...items]);
      setNext(res.next);
      setLoading('loaded');
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFetchMore = () => fetchEvents(next);

  const handleRenderItem = (item: Row) => {
    return (
      <TableRow columns={14}>
        <div className="table-column">{printDate(item.createdAt)}</div>
        <div className="table-column">{item.stat.signups}</div>
        <div className="table-column">{item.stat.pwa_installs}</div>
        <div className="table-column">{item.stat.notifications_enabled}</div>
        <div className="table-column">{item.stat.users_day}</div>
        <div className="table-column">{item.stat.users_week}</div>
        <div className="table-column">{item.stat.users_month}</div>
        <div className="table-column">{item.stat.return_users_day}</div>
        <div className="table-column">{item.stat.return_users_week}</div>
        <div className="table-column">{item.stat.return_users_month}</div>
        <div className="table-column">{item.stat.posts_day}</div>
        <div className="table-column">{item.stat.posts_week}</div>
        <div className="table-column">{item.stat.comments_day}</div>
        <div className="table-column">{item.stat.comments_week}</div>
      </TableRow>
    );
  };

  const handleRenderHead = () => {
    return (
      <TableRow columns={14} head>
        <div className="table-column">Timestamp (UTC)</div>
        <div className="table-column">Signups</div>
        <div className="table-column">PWA intalls</div>
        <div className="table-column">Notifications enabled</div>
        <div className="table-column">Users 24h</div>
        <div className="table-column">Users 7d</div>
        <div className="table-column">Users 30d</div>
        <div className="table-column">Return users 24h</div>
        <div className="table-column">Return users 7d</div>
        <div className="table-column">Return users 30d</div>
        <div className="table-column">Posts 24h</div>
        <div className="table-column">Posts 7d</div>
        <div className="table-column">Comments 24h</div>
        <div className="table-column">Comments 7d</div>
      </TableRow>
    );
  };

  const isMobile = useIsMobile();

  const [tableWidth, setTableWidth] = useState(345);
  useLayoutEffect(() => {
    if (isMobile) {
      const el = document.querySelector('.dashboard-head .inner-wrap');
      if (el) {
        const styles = getComputedStyle(el);
        setTableWidth(
          el.scrollWidth - parseInt(styles.paddingLeft) - parseInt(styles.paddingRight)
        );
      }
    }
  }, [isMobile]);

  if (loading !== 'loaded') {
    return <PageLoading />;
  }

  const feedItems: SimpleFeedItem<Row>[] = [];
  rows?.forEach((row) => feedItems.push({ item: row, key: row.createdAt.toString() }));

  return (
    <div className="dashboard-page-analytics document">
      <div className="dashboard-page-title">Analytics</div>
      <div className="bashboard-page-content">
        <div className="table-wrap" style={{ width: isMobile ? tableWidth : undefined }}>
          <SimpleFeed
            className="table"
            items={feedItems}
            onRenderItem={handleRenderItem}
            onRenderHead={handleRenderHead}
            hasMore={Boolean(next)}
            onFetchMore={handleFetchMore}
          />
        </div>
      </div>
    </div>
  );
}
