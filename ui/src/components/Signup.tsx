import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { usernameMaxLength } from '../config';
import { APIError, mfetch, validEmail } from '../helper';
import { useDelayedEffect, useInputUsername } from '../hooks';
import { loginModalOpened, snackAlertError } from '../slices/mainSlice';
import { RootState } from '../store';
import { ButtonClose } from './Button';
import { Form, FormField } from './Form';
import Input, { InputPassword, InputWithCount } from './Input';
import Modal from './Modal';

const errors = [
  'Username cannot be empty.',
  'Password cannot be empty.',
  'Username too short.',
  'Enter a valid email address.',
  'Password too weak.',
  'Repeat password cannot be empty.',
  'Passwords do not match.',
];

const Signup = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const dispatch = useDispatch();

  const signupsDisabled = useSelector<RootState>((state) => state.main.signupsDisabled) as boolean;

  const [username, handleUsernameChange] = useInputUsername(usernameMaxLength);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const checkUsernameExists = useCallback(async () => {
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
  }, [dispatch, username]);
  useDelayedEffect(checkUsernameExists);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  useEffect(() => {
    setEmailError(null);
  }, [email]);

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  useEffect(() => {
    setPasswordError(null);
  }, [password]);

  const [repeatPassword, setRepeatPassword] = useState('');
  const [repeatPasswordError, setRepeatPasswordError] = useState<string | null>(null);
  useEffect(() => {
    setRepeatPasswordError(null);
  }, [repeatPassword]);

  const CAPTCHA_ENABLED = import.meta.env.VITE_CAPTCHASITEKEY ? true : false;
  const captchaRef = useRef<ReCAPTCHA>(null);
  const handleCaptchaVerify = (token: string | null) => {
    if (!token) {
      dispatch(snackAlertError(new Error('Empty captcha token')));
      return;
    }
    signInUser(username, email, password, token);
  };
  const signInUser = async (
    username: string,
    email: string,
    password: string,
    captchaToken?: string
  ) => {
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
  const handleCaptchaError = (error: unknown) => {
    dispatch(snackAlertError(error));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const handleOnLogin = (event: React.MouseEvent) => {
    event.preventDefault();
    onClose();
    dispatch(loginModalOpened());
  };

  return (
    <>
      <Helmet>
        <style>{`.grecaptcha-badge { visibility: hidden; }`}</style>
      </Helmet>
      <Modal open={open} onClose={onClose} noOuterClickClose={false}>
        <div className={clsx('modal-card modal-signup', signupsDisabled && 'is-disabled')}>
          <div className="modal-card-head">
            <div className="modal-card-title">Signup</div>
            <ButtonClose onClick={onClose} />
          </div>
          <Form className="modal-card-content" onSubmit={handleSubmit}>
            {signupsDisabled && (
              <div className="modal-signup-disabled">{`We have temporarily disabled creating new accounts. Please check back again later.`}</div>
            )}
            <FormField
              className="is-username"
              label="Username"
              description="The name you will use when interacting with the community."
              error={usernameError || undefined}
            >
              <InputWithCount
                maxLength={usernameMaxLength}
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => checkUsernameExists()}
                autoFocus
                autoComplete="username"
                disabled={signupsDisabled}
              />
            </FormField>
            <FormField
              label="Email (optional)"
              description="Without an email address, there's no way to recover your account if you lose your password."
              error={emailError || undefined}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={signupsDisabled}
              />
            </FormField>
            <FormField label="Password" error={passwordError || undefined}>
              <InputPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={signupsDisabled}
              />
            </FormField>
            <FormField label="Repeat password" error={repeatPasswordError || undefined}>
              <InputPassword
                value={repeatPassword}
                onChange={(e) => {
                  setRepeatPassword(e.target.value);
                }}
                autoComplete="new-password"
                disabled={signupsDisabled}
              />
            </FormField>
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
            <FormField>
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
            </FormField>
            <FormField className="is-submit">
              <input type="submit" className="button button-main" value="Signup" />
              <button className="button-link" onClick={handleOnLogin} disabled={signupsDisabled}>
                Already have an account? Login
              </button>
            </FormField>
          </Form>
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
