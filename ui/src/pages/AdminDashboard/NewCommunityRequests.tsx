import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { snackAlertError } from '../../slices/mainSlice';

interface CommunityRequest {
  id: number;
  byUser: string;
  communityName: string;
  communityExists: boolean;
  note: string | null;
  createdAt: Date;
}

export default function NewCommunityRequests() {
  const [requests, setRequests] = useState<CommunityRequest[] | null>(null);
  const [loading, setLoading] = useLoading();
  const dispatch = useDispatch();
  useEffect(() => {
    const f = async () => {
      try {
        let res = (await mfetchjson('/api/community_requests')) as CommunityRequest[];
        res = res.map((res) => {
          return {
            ...res,
            createdAt: new Date(res.createdAt),
          };
        });
        setRequests(res);
        setLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setLoading('error');
      }
    };
    f();
  }, []);

  if (loading !== 'loaded') {
    return <PageLoading />;
  }

  const handleRenderItem = (item: CommunityRequest) => {
    const El = item.communityExists ? Link : 'div';
    const elProps = {
      to: item.communityExists ? `/${item.communityName}` : '',
    };
    return (
      <TableRow columns={4}>
        <div className="table-column">{item.createdAt.toLocaleString()}</div>
        <div className="table-column">
          <Link to={`/@${item.byUser}`}>@{item.byUser}</Link>
        </div>
        <div className="table-column">
          <El {...elProps}>+{item.communityName}</El>
        </div>
        <div className="table-column">{item.note}</div>
      </TableRow>
    );
  };

  const handleRenderHead = () => {
    return (
      <TableRow columns={4} head>
        <div className="table-column">Datetime</div>
        <div className="table-column">By user</div>
        <div className="table-column">Community name</div>
        <div className="table-column">Note</div>
      </TableRow>
    );
  };

  const feedItems: SimpleFeedItem<CommunityRequest>[] = [];
  requests?.forEach((req) => feedItems.push({ item: req, key: req.id.toString() }));

  return (
    <div className="dashboard-page-requests document">
      <div className="dashboard-page-title">New community requests</div>
      <div className="dashboard-page-content">
        <SimpleFeed
          className="table"
          items={feedItems}
          onRenderItem={handleRenderItem}
          onRenderHead={handleRenderHead}
        />
      </div>
    </div>
  );
}
