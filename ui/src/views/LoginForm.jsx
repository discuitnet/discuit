import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Input, { InputPassword } from '../components/Input';
import { APIError, mfetch } from '../helper';
import { loginModalOpened, signupModalOpened, snackAlertError } from '../slices/mainSlice';

const LoginForm = ({ isModal = false }) => {
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  useEffect(() => {
    setLoginError(null);
  }, [username, password]);
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username === '' && password === '') {
      setLoginError('Username and password empty.');
      return;
    } else if (username === '') {
      setLoginError('Username empty.');
      return;
    } else if (password === '') {
      setLoginError('Password empty.');
      return;
    }
    try {
      let res = await mfetch('/api/_login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        if (res.status === 401) {
          setLoginError('Username and password do not match.');
        } else if (res.status === 403) {
          const json = await res.json();
          if (json.code === 'account_suspended') {
            setLoginError(`@${username} is suspended.`);
          } else {
            throw new APIError(res.status, json);
          }
        } else {
          throw new APIError(res.status, await res.json());
        }
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const usernameRef = useRef();
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === '/login') {
      usernameRef.current.focus();
    }
  }, [pathname]);

  const handleOnSignup = (e) => {
    e.preventDefault();
    dispatch(loginModalOpened(false));
    dispatch(signupModalOpened());
  };

  return (
    <form className="login-box modal-card-content" onSubmit={handleLoginSubmit}>
      <Input
        ref={usernameRef}
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus={isModal}
        autoComplete="username"
      />
      <InputPassword
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {loginError && <div className="form-error text-center">{loginError}</div>}
      <input type="submit" className="button button-main" value="Login" />
      <button className="button-link modal-alt-link" onClick={handleOnSignup}>
        {"Don't have an account? Signup"}
      </button>
    </form>
  );
};

LoginForm.propTypes = {
  isModal: PropTypes.bool,
};

export default LoginForm;
