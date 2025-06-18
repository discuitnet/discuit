import { memo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ButtonClose } from '../../components/Button';
import { FormField } from '../../components/Form';
import { InputWithCount, useInputMaxLength } from '../../components/Input';
import Modal from '../../components/Modal';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { declineCommNoteMaxLength } from '../../config';
import { mfetch, mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { loginPromptToggled, snackAlert, snackAlertError } from '../../slices/mainSlice';
import { RootState } from '../../store';

interface CommunityRequest {
  id: number;
  byUser: string;
  communityName: string;
  communityExists: boolean;
  note: string | null;
  createdAt: Date;
  deniedNote: string | null;
  deniedBy: string | null;
  deniedAt: string | null;
}

interface StatusCellProps {
  item: CommunityRequest;
}

const StatusCell = ({ item }: StatusCellProps) => {
  const [currentStatus, setCurrentStatus] = useState('');
  // Ordering matters here: must check the textual currentStatus first since
  // checking the item attributes first means they will trigger and the
  // state-linked denied_now and denied_prev cases will never trigger
  if (currentStatus === 'denied_now') {
    return 'You just denied this request.';
  } else if (currentStatus === 'denied_prev') {
    return 'Someone else denied this request.';
  } else if (item.communityExists) {
    return 'Created.';
  } else if (item.deniedAt) {
    return `Denied by ${item.deniedBy} at ${Date.parse(item.deniedAt).toLocaleString()} because: ${item.deniedNote}`;
  } else if (!item.communityExists && !item.deniedAt) {
    return (
      <DenyCommunityButton
        className={'button button-main home-btn-new-post'}
        item={item}
        setCurrentStatus={setCurrentStatus}
      >
        Deny
      </DenyCommunityButton>
    );
  } else {
    return 'Request status could not be loaded.';
  }
};

const MemoStatusCell = memo(StatusCell);

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
            createdAt: new Date(res.createdAt as unknown as string),
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
          <MemoStatusCell item={item} />
        </div>
      </TableRow>
    );
  };

  const handleRenderHead = () => {
    return (
      <TableRow columns={5} head>
        <div className="table-column">Datetime</div>
        <div className="table-column">By user</div>
        <div className="table-column">Community name</div>
        <div className="table-column">Note</div>
        <div className="table-column">Status</div>
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

interface DenyCommunityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  setCurrentStatus: (status: string) => void;
  item: CommunityRequest;
}

const DenyCommunityButton = ({
  children,
  item,
  setCurrentStatus,
  ...props
}: DenyCommunityButtonProps) => {
  const user = useSelector<RootState>((state) => state.main.user);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);
  const [note, handleNoteChange] = useInputMaxLength(declineCommNoteMaxLength);

  const handleButtonClick = () => {
    if (user === null) {
      dispatch(loginPromptToggled());
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const res = await mfetch(`/api/_admin`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'deny_comm',
          id: item.id,
          body: defaultMessage + (note ? ' ' + note : ''),
        }),
      });
      if (res.ok) {
        dispatch(snackAlert('Denial alert sent.'));
        setCurrentStatus('denied_now');
        handleClose();
      } else {
        const error = await res.json();
        dispatch(snackAlert(error.message));
        if (error.code == 'already_denied') {
          setCurrentStatus('denied_prev');
        }
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const defaultMessage = `Your request for +${item.communityName} has been declined.`;
  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="modal-card modal-form">
          <div className="modal-card-head">
            <div className="modal-card-title">Deny community request</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="form modal-card-content flex-column inner-gap-1">
            <FormField
              label="Add additional text to default notification:"
              description={`${defaultMessage}`}
            >
              <InputWithCount
                value={note}
                onChange={handleNoteChange}
                textarea
                rows={4}
                maxLength={declineCommNoteMaxLength}
                style={{ marginBottom: '0' }}
                autoFocus
              />
            </FormField>
            <FormField>
              <button className="button-main" onClick={handleSubmit} style={{ width: '100%' }}>
                Send
              </button>
            </FormField>
          </div>
        </div>
      </Modal>
      <button onClick={handleButtonClick} {...props}>
        {children}
      </button>
    </>
  );
};
