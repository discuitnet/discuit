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

////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////

interface StatusCellProps {
  initialStatus: string;
  item: CommunityRequest;
}

/*
initial state is easy to populate from item
state only needs to change after interacting with the modal
- if there is an error message from the server saying it was already denied, can populate with generic message saying that (no endpoint to extract specific
  request record, but the error message can be modified to do that)
- if the denial was succesfully sent (use the request details to populate info)

Therefore, the DenyCommunityButton needs to be able to be monitored by its parent, StatusCell

Can have code for all three possible states but only show one?

useState should handle that?

list of valid request statuses used to validate?

(... as any), comments on usage?

overuse of closure?
*/
////////////////// need to change the cell's state somehow after successful denial submit or error of previously denied

////////////// service worker's refresh is closing the modal?

/////////////// the other admin pages do seem to have a refresh too... just use a global modal?

/*
timer of 5 seconds in app.tsx:
useEffect(() => {
    if (loggedIn) {

is causing the modal to disappear
* is the global state changing somehow
* if it is the global state, then getting a new notification will make the modal disappear?
* why isn't the create community modal disappearing?

*/

const StatusCell = ({initialStatus = '', item}: StatusCellProps) => {
  ////// this needs to be nested in statuscell so its state can be updated?
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
    const [formError, setFormError] = useState('');
    const [note, handleNoteChange] = useInputMaxLength(declineCommNoteMaxLength);

    useEffect(() => {
      setFormError('');
    }, [note]);

    const handleButtonClick = () => {
      if (user === null) {
        dispatch(loginPromptToggled());
        return;
      }
      setOpen(true);
    };

    const handleSubmit = async () => {
      if (note.length < 10) {
        ////////////////// check length in backend? set default message for decline?
        alert('Type at least 10 characters for community denial message.');
        return;
      }
      try {
        const res = await mfetch(`/api/_admin`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'deny_comm', name: item.byUser, id: item.id, body: note, deniedBy: (user as any).username 
          }),
        });
        if (res.ok) {
          dispatch(snackAlert('Denial alert sent.'));
          /////////////////////////////// nuke the button and replace it with denial text
          //setCurrentStatus('denied_now');
          handleClose();
        } else {
          const error = await res.json();
          dispatch(snackAlert(error.message));
          if (error.code == 'already_denied') {
            //setCurrentStatus('denied_prev');
          }
        }
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    };

    const defaultMessage = `Your request for ${item.communityName} has been declined.`;
    return (
      <>
        <Modal open={open} onClose={handleClose}>
          <div className="modal-card modal-form">
            <div className="modal-card-head">
              <div className="modal-card-title">Deny community request</div>
              <ButtonClose onClick={handleClose} />
            </div>
            <div className="form modal-card-content flex-column inner-gap-1">
              <FormField label="Additional note to user" description={`Default: <b>${defaultMessage}</b>`}>
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
              {formError !== '' && (
                <div className="form-field">
                  <div className="form-error text-center">{formError}</div>
                </div>
              )}
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

  var currentStatus = initialStatus;
//  const [currentStatus, setCurrentStatus] = useState(initialStatus);
//  console.log("In statuscell; current status", currentStatus, item.communityName)
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

const M = memo(StatusCell);


////////////////////////////////////////clean up " vs ' ////////////////////////////////////////////////////

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
    ////////////////////// this is causing too many renders, because setting the state rerenders?
    //const [reqStatus, setReqStatus] = useState('');
    var initialStatus = '';
    if (item.communityExists) {
      initialStatus = 'created';
      //setReqStatus('created');
    } else if (item.deniedAt) {
      initialStatus = 'denied';
      //setReqStatus('denied');
    } else if (!item.communityExists && !item.deniedAt) {
      initialStatus = 'pending';
      //setReqStatus('pending');
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
          <M initialStatus={initialStatus} item={item} />
        </div>
      </TableRow>
    );
  };
  //          <StatusCell status={reqStatus} />

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
// why is button not showing unless class is removed?  className="button-main "
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
