import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import { FormField } from '../../components/Form';
import Input, { InputPassword } from '../../components/Input';
import Modal from '../../components/Modal';
import { APIError, mfetch } from '../../helper';
import { User } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';

const DeleteAccount = ({ user }: { user: User }) => {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const [confirm, setConfirm] = useState('');
  const [password, _setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const setPassword = (password: string) => {
    _setPassword(password);
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
          <div className="form modal-card-content">
            <div className="form-field">
              <p>Proceed with caution: deleted accounts cannot be restored.</p>
            </div>
            <FormField label="Password:" error={passwordError ? 'Invalid password' : undefined}>
              <InputPassword value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <FormField label="Type YES to continue:">
              <Input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </FormField>
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

export default DeleteAccount;
