import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';

const Banned = ({ community }) => {
  const dispatch = useDispatch();

  const baseURL = `/api/communities/${community.id}`;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useLoading();
  useEffect(() => {
    (async () => {
      try {
        const banned = await mfetchjson(`${baseURL}/banned`);
        setUsers(banned);
        setLoading('loaded');
      } catch (error) {
        setLoading('failed');
      }
    })();
  }, [community.id]);

  const [modalError, setModalError] = useState('');
  const [username, _setUsername] = useState('');
  const setUsername = (name) => {
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

  const handleUnbanClick = async (username) => {
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
    <div className="modtools-content modtools-banned">
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
            <Input
              label="Username"
              value={username}
              error={modalError}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </form>
          <div className="modal-card-actions">
            <button className="button-main" disabled={username === ''} onClick={handleBanClick}>
              Ban
            </button>
            <button onClick={handleBanModalClose}>Cancel</button>
          </div>
        </div>
      </Modal>
      <div className="modtools-content-head">
        <div className="modtools-title">Banned ({users.length})</div>
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
    </div>
  );
};

Banned.propTypes = {
  community: PropTypes.object.isRequired,
};

export default Banned;
