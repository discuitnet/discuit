import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import Input, { InputPassword } from '../../components/Input';
import Modal from '../../components/Modal';
import { APIError, mfetch } from '../../helper';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';

const DeleteAccount = () => {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const [yes, setYes] = useState('');
  const [password, setPassword] = useState('');
  const handleOnDelete = async () => {
    try {
      const res = await mfetch(`/api/_settings`, {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          dispatch(snackAlert('Invalid password', 'invld_pass'));
          return;
        }
        throw new APIError(res.status, await res.json());
      }
      window.location.reload();
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
            <p>Cannot undo this mate.</p>
            <InputPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Password"
            />
            <Input
              type="text"
              value={yes}
              onChange={(e) => setYes(e.target.value)}
              label="Type YES to continue:"
            />
          </div>
          <div className="modal-card-actions">
            <button className="button-red" onClick={handleOnDelete} disabled={yes !== 'YES'}>
              Delete
            </button>
            <button onClick={handleClose}>Cancel</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DeleteAccount;
