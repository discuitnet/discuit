/*
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { usernameMaxLength } from '../config';
import { APIError, mfetch } from '../helper';
import { useDelayedEffect, useInputUsername } from '../hooks';

import { ButtonClose } from './Button';
import { Form, FormField } from './Form';
import Input, { InputWithCount } from './Input';
import Modal from './Modal';
*/
//import { useDispatch, useSelector } from 'react-redux';
//import { snackAlertError } from '../slices/mainSlice';
import { useQuery } from '../hooks';
import { FormField } from '../components/Form';
import { InputPassword } from '../components/Input';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { mfetch } from '../helper';
import { snackAlert, snackAlertError } from '../slices/mainSlice';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';

/*
/api/users/{username}/reset_password

/@username/reset_password/:resetLink
*/

const PasswordReset = () => {
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
      const res = await mfetch(`/api/password_reset/${username}/${resetLink}`, {
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

  // check username-resetLink are valid on DB before sending, or on send?
  return (
    <div className="page-content page-passwordreset">
        <Helmet>
          <title>Bad password reset link</title>
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

export default PasswordReset;