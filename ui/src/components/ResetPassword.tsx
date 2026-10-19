import { useQuery } from '../hooks';
import { FormField } from './Form';
import { InputPassword } from './Input';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { mfetch } from '../helper';
import { snackAlert, snackAlertError } from '../slices/mainSlice';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from './Sidebar';

const ResetPassword = () => {
  const dispatch = useDispatch();
  const query = useQuery();
  let [username, resetLink, err] = ['', '', false];
  if (query.has('username')) {
    const _username = query.get('username');
    if (_username !== null) {
       username = _username;
    } else {
      err = true;
    }
  } else {
    err = true;
  }
  if (query.has('resetLink')) {
    const _resetLink = query.get('resetLink');
    if (_resetLink !== null) {
       resetLink = _resetLink;
    } else {
      err = true;
    }
  } else {
    err = true;
  }
  if (err) {
    return (
      <div className="page-content page-passwordreset">
        <Helmet>
          <title>Bad password reset link</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Sidebar />
        <h1>Bad password reset link</h1>
        <p>Password reset link missing username/resetLink parameters.</p>
        <Link to="/">Go home.</Link>
      </div>
    )
  }

  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const changePassword = async () => {
    if (newPassword !== repeatPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password too short.');
      return;
    }
    try {
      const res = await mfetch(`/api/reset_password/${username}/${resetLink}`, {
        method: 'POST',
        body: JSON.stringify({
          newPassword,
          repeatPassword,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        dispatch(snackAlert(error.message));
      } else {
        dispatch(snackAlert('Password changed succesfully.'));
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <div className="page-content page-passwordreset">
        <Helmet>
          <title>Password reset</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Sidebar />
        <div
          className="form"
          onKeyDown={(e) => e.key === 'Enter' && changePassword()}
          role="none"
        >
          <FormField label={`New password for ${username}`}>
            <InputPassword value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>
          <FormField label="Repeat password">
            <InputPassword
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </FormField>
          <FormField>
            <div className="modal-card-actions">
              <button className="button-main" onClick={changePassword}>
                Change password
              </button>
            </div>
          </FormField>
        </div>

    </div>
  );
}

export default ResetPassword;