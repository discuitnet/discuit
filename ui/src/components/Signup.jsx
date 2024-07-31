/* eslint-disable react/jsx-no-target-blank */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ButtonClose } from './Button';
import Input, { InputPassword, InputWithCount } from './Input';
import Modal from './Modal';
import { useDispatch } from 'react-redux';
import { loginModalOpened, snackAlert, snackAlertError } from '../slices/mainSlice';
import { APIError, mfetch, validEmail } from '../helper';
import { useDelayedEffect, useInputUsername } from '../hooks';
import { usernameMaxLength } from '../config';
import ReCAPTCHA from 'react-google-recaptcha';
import { useRef } from 'react';
import { Helmet } from 'react-helmet-async';

const errors = [
  'Username cannot be empty.',
  'Password cannot be empty.',
  'Username too short.',
  'Enter a valid email address.',
  'Password too weak.',
  'Repeat password cannot be empty.',
  'Passwords do not match.',
];

const Signup = ({ open, onClose }) => {
  const dispatch = useDispatch();

  const [username, handleUsernameChange] = useInputUsername(usernameMaxLength);
  const [usernameError, setUsernameError] = useState(null);
  const checkUsernameExists = async () => {
    if (username === '') return true;
    try {
      const res = await mfetch(`/api/users/${username}`);
      if (!res.ok) {
        if (res.status === 404) {
          setUsernameError(null);
          return false;
        }
        throw new APIError(res.status, await res.json());
      }
      setUsernameError(`${username} is already taken.`);
      return true;
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };
  useDelayedEffect(checkUsernameExists, [username]);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  useEffect(() => {
    setEmailError(null);
  }, [email]);

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  useEffect(() => {
    setPasswordError(null);
  }, [password]);

  const [repeatPassword, setRepeatPassword] = useState('');
  const [repeatPasswordError, setRepeatPasswordError] = useState(null);
  useEffect(() => {
    setRepeatPasswordError(null);
  }, [repeatPassword]);

  const CAPTCHA_ENABLED = import.meta.env.VITE_CAPTCHASITEKEY ? true : false;
  const captchaRef = useRef();
  const handleCaptchaVerify = (token) => {
    if (!token) {
      dispatch(snackAlert('Something went wrong. Try again.'));
      return;
    }
    signInUser(username, email, password, token);
  };
  const signInUser = async (username, email, password, captchaToken) => {
    try {
      const res = await mfetch('/api/_signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, captchaToken }),
      });
      if (!res.ok) throw new APIError(res.status, await res.json());
      window.location.reload();
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };
  const handleCaptchaError = (error) => {
    dispatch(snackAlertError(error));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let errFound = false;
    if (!username) {
      errFound = true;
      setUsernameError(errors[0]);
    } else if (username.length < 4) {
      errFound = true;
      setUsernameError(errors[2]);
    } else if ((await checkUsernameExists()) === true) {
      errFound = true;
    }
    if (!password) {
      errFound = true;
      setPasswordError(errors[1]);
    } else if (password.length < 8) {
      errFound = true;
      setPasswordError(errors[4]);
    }
    if (!repeatPassword) {
      errFound = true;
      setRepeatPasswordError(errors[5]);
    } else if (password !== repeatPassword) {
      errFound = true;
      setRepeatPasswordError(errors[6]);
    }
    if (email) {
      if (!validEmail(email)) {
        errFound = true;
        setEmailError(errors[3]);
      }
    }
    if (errFound) {
      return;
    }
    if (!CAPTCHA_ENABLED) {
      signInUser(username, email, password);
      return;
    }
    if (!captchaRef.current) {
      dispatch(snackAlertError(new Error('captcha API not found')));
      return;
    }
    captchaRef.current.execute();
  };

  const handleOnLogin = (e) => {
    e.preventDefault();
    onClose();
    dispatch(loginModalOpened());
  };

  return (
    <>
      <Helmet>
        <style>{`.grecaptcha-badge { visibility: hidden; }`}</style>
      </Helmet>
      <Modal open={open} onClose={onClose} noOuterClickClose={false}>
        <div className="modal-card modal-form modal-signup">
          <div className="modal-card-head">
            <div className="modal-card-title">Signup</div>
            <ButtonClose onClick={onClose} />
          </div>
          <form className="modal-card-content" onSubmit={handleSubmit}>
            <InputWithCount
              label="Username"
              maxLength={usernameMaxLength}
              description="The name you will use when interacting with the community."
              error={usernameError}
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => checkUsernameExists()}
              autoFocus
              style={{ marginBottom: 0 }}
              autoComplete="username"
            />
            <Input
              type="email"
              label="Email (optional)"
              description="Without an email address, there's no way to recover your account if you lose your password."
              value={email}
              error={emailError}
              onChange={(e) => setEmail(e.target.value)}
            />
            <InputPassword
              label="Password"
              value={password}
              error={passwordError}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <InputPassword
              label="Repeat password"
              value={repeatPassword}
              error={repeatPasswordError}
              onChange={(e) => {
                setRepeatPassword(e.target.value);
              }}
              style={{ marginBottom: 0 }}
              autoComplete="new-password"
            />
            {CAPTCHA_ENABLED && (
              <div style={{ margin: 0 }}>
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={import.meta.env.VITE_CAPTCHASITEKEY}
                  onChange={handleCaptchaVerify}
                  size="invisible"
                  onError={handleCaptchaError}
                />
              </div>
            )}
            <p className="modal-signup-terms">
              {'By creating an account, you agree to our '}
              <a target="_blank" href="/terms">
                Terms
              </a>
              {' and '}
              <a target="_blank" href="/privacy-policy">
                {' Privacy Policy'}
              </a>
              .
            </p>
            <p className="modal-signup-terms is-captcha">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy-policy" target="_blank">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="https://policies.google.com/terms" target="_blank">
                Terms of Service
              </a>{' '}
              apply.
            </p>
            <input type="submit" className="button button-main" value="Signup" />
            <button className="button-link modal-alt-link" onClick={handleOnLogin}>
              Already have an account? Login
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
};

Signup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Signup;
