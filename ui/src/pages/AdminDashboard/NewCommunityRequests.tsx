import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { denyCommunityModalOpened, snackAlertError } from '../../slices/mainSlice';
//import { mfetch } from '../../helper';
import Button from '../../components/Button';
//import DenyCommunity from '../../components/DenyCommunity';

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
      <TableRow columns={5}>
        <div className="table-column">{item.createdAt.toLocaleString()}</div>
        <div className="table-column">
          <Link to={`/@${item.byUser}`}>@{item.byUser}</Link>
        </div>
        <div className="table-column">
          <El {...elProps}>+{item.communityName}</El>
        </div>
        <div className="table-column">{item.note}</div>
        <div className="table-column">
          <Button
            onClick={() => dispatch(denyCommunityModalOpened())}
            className={'button button-main'}
          >
            Deny
          </Button>
        </div>
      </TableRow>
    );
  };
        //dispatch(createCommunityModalOpened())}
  const handleRenderHead = () => {
    return (
      <TableRow columns={4} head>
        <div className="table-column">Datetime</div>
        <div className="table-column">By user</div>
        <div className="table-column">Community name</div>
        <div className="table-column">Note</div>
        <div className="table-column">Action</div>
      </TableRow>
    );
  };

  const feedItems: SimpleFeedItem<CommunityRequest>[] = [];
  requests?.forEach((req) => feedItems.push({ item: req, key: req.id.toString() }));

  /*const handleDeclineRequest = async (item: CommunityRequest) => {
     	<DenyCommunity
    	open={denyCommunityModalOpened}
    	onClose={() => dispatch(denyCommunityModalOpened(false))}
  	/>

<div className="form modal-card-content flex-column inner-gap-1">
  <FormField label="Community name" description="Community name cannot be changed.">
    <InputWithCount
      value={name}
      onChange={handleNameChange}
      maxLength={communityNameMaxLength}
      style={{ marginBottom: '0' }}
      autoFocus
    />
  </FormField>
  </div>
    const body = {
      action: 'deny_comm',
      name: item.byUser,
      id : item.id,
      body: `${item.communityName} denied!`,
    };
    const res = await mfetch(`/api/_admin`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (res.ok) {
      alert('Disc denied.');
    } else {
      alert('Error denying disc.');
    }
  }*/

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
