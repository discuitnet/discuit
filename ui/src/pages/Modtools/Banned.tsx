import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import DashboardPage from '../../components/Dashboard/DashboardPage';
import { FormField } from '../../components/Form';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { Community, User } from '../../serverTypes';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';

const Banned = ({ community }: { community: Community }) => {
  const dispatch = useDispatch();

  const baseURL = `/api/communities/${community.id}`;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useLoading();
  useEffect(() => {
    (async () => {
      try {
        const banned = await mfetchjson(`${baseURL}/banned`);
        setUsers(banned);
        setLoading('loaded');
      } catch {
        setLoading('error');
      }
    })();
  }, [community.id, baseURL, setLoading]);

  const [modalError, setModalError] = useState('');
  const [username, _setUsername] = useState('');
  const setUsername = (name: string) => {
    if (name === '') setModalError('');
    _setUsername(name);
  };
  const [banModalOpen, setBanModalOpen] = useState(false);
  const handleBanModalClose = () => {
    setBanModalOpen(false);
    setUsername('');
  };
  const handleBanClick = async () => {
    try {
      const res = await mfetch(`${baseURL}/banned`, {
        method: 'POST',
        body: JSON.stringify({
          username,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setModalError('No user with username exists.');
        } else if (res.status === 409) {
          setModalError(`${username} is already banned.`);
        } else if (res.status === 403) {
          dispatch(snackAlert('Forbidden.', 'forbidden'));
        } else {
          throw new APIError(res.status, await res.json());
        }
      } else {
        dispatch(snackAlert(`@${username} is banned.`));
        const user = await res.json();
        setUsers((users) => [...users, user]);
        handleBanModalClose();
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleUnbanClick = async (username: string) => {
    try {
      const user = await mfetchjson(`${baseURL}/banned`, {
        method: 'DELETE',
        body: JSON.stringify({
          username,
        }),
      });
      setUsers((users) => users.filter((u) => u.username !== user.username));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  if (loading !== 'loaded') {
    return null;
  }

  return (
    <DashboardPage className="modtools-banned" title={`Banned (${users.length})`} fullWidth>
      <Modal open={banModalOpen} onClose={handleBanModalClose}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">Ban user</div>
            <ButtonClose onClick={handleBanModalClose} />
          </div>
          <form
            className="modal-card-content"
            onSubmit={(e) => {
              e.preventDefault();
              handleBanClick();
            }}
          >
            <FormField label="Username" error={modalError}>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </FormField>
          </form>
          <div className="modal-card-actions">
            <button className="button-main" disabled={username === ''} onClick={handleBanClick}>
              Ban
            </button>
            <button onClick={handleBanModalClose}>Cancel</button>
          </div>
        </div>
      </Modal>
      <div className="modtools-ban-new-user">
        <button className="button-main" onClick={() => setBanModalOpen(true)}>
          Ban user
        </button>
      </div>
      <div className="modtools-banned-users">
        <div className="table">
          {users.map((user) => (
            <div key={user.id} className="table-row">
              <div className="table-column">@{user.username}</div>
              <div className="table-column"></div>
              <div className="table-column">
                <button onClick={() => handleUnbanClick(user.username)}>Unban</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardPage>
  );
};

export default Banned;
