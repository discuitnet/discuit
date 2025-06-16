import { memo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { declineCommNoteMaxLength } from '../../config';
import { FormField } from '../../components/Form';
import { InputWithCount, useInputMaxLength } from '../../components/Input';
import { mfetch } from '../../helper';
import Modal from '../../components/Modal';
import PageLoading from '../../components/PageLoading';
import { RootState } from '../../store';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { loginPromptToggled, snackAlert, snackAlertError } from '../../slices/mainSlice';
import { ButtonClose } from '../../components/Button';

interface CommunityRequest {
  id: number;
  byUser: string;
  communityName: string;
  communityExists: boolean;
  note: string | null;
  createdAt: Date;
  deniedNote: string | null;
  deniedBy: string | null;
  deniedAt: Date | null;
}

interface StatusCellProps {
  initialStatus: string;
  item: CommunityRequest;
}

const StatusCell = ({initialStatus = '', item}: StatusCellProps) => {
  interface DenyCommunityButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isMobile?: boolean;
    item: CommunityRequest;
  }

  const DenyCommunityButton = ({
    children,
    isMobile = false,
    item,
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
            action: 'deny_comm', id: item.id, body: defaultMessage + (note ? ' ' + note : '')
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
              <FormField label="Add additional text to default notification:" description={`${defaultMessage}`}>
                <InputWithCount
                  value={note}
                  onChange={handleNoteChange}
                  textarea
                  rows={4}
                  maxLength={declineCommNoteMaxLength - defaultMessage.length - 1}
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

  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  if (currentStatus == 'created') {
    return ('Created.');
  } else if (currentStatus == 'denied') {
    return (`Denied by ${item.deniedBy} at ${(item.deniedAt as any).toLocaleString()} because: ${item.deniedNote}`);
  } else if (currentStatus == 'denied_now') {
    return ('You just denied this request.');
  } else if (currentStatus == 'denied_prev') {
    return ('Someone else denied this request.');
  } else if (currentStatus == 'pending') {
    return (
      <DenyCommunityButton
        className={"button button-main home-btn-new-post"}
        item={item}
      >
        Deny
      </DenyCommunityButton>
    );
  } else {
    return ('Request status could not be loaded.');
  }
}

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
    var initialStatus = '';
    if (item.communityExists) {
      initialStatus = 'created';
    } else if (item.deniedAt) {
      initialStatus = 'denied';
    } else if (!item.communityExists && !item.deniedAt) {
      initialStatus = 'pending';
    }
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
          <MemoStatusCell initialStatus={initialStatus} item={item} />
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
    <>
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
    </>
  );
}
