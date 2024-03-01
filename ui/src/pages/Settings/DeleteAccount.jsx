import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import Input, { InputPassword } from '../../components/Input';
import Modal from '../../components/Modal';
import { APIError, mfetch } from '../../helper';
import { snackAlertError } from '../../slices/mainSlice';

const DeleteAccount = ({ user }) => {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const [confirm, setConfirm] = useState('');
  const [password, _setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const setPassword = (pass) => {
    _setPassword(pass);
    setPasswordError(false);
  };
  const handleOnDelete = async () => {
    try {
      const res = await mfetch(`/api/users/${user.username}`, {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          setPasswordError(true);
          return;
        }
        throw new APIError(res.status, await res.json());
      }
      alert('Your account is successfully deleted!');
      // Send the user to the home page.
      window.location.href = window.location.origin;
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <>
      <button className="button-red" onClick={() => setOpen(true)}>
        Delete account
      </button>
      <Modal open={open} onClose={handleClose}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">Delete account</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="modal-card-content">
            <p>Proceed with caution: deleted accounts cannot be restored.</p>
            <InputPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Password"
              error={passwordError ? 'Invalid password' : undefined}
            />
            <Input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              label="Type YES to continue:"
            />
          </div>
          <div className="modal-card-actions">
            <button className="button-red" onClick={handleOnDelete} disabled={confirm !== 'YES'}>
              Delete
            </button>
            <button onClick={handleClose}>Cancel</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

DeleteAccount.propTypes = {
  user: PropTypes.object,
};

export default DeleteAccount;
