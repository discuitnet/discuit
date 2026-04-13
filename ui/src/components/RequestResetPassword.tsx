import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Helmet } from 'react-helmet-async';
import { useDispatch/*, useSelector*/ } from 'react-redux';
import { usernameMaxLength } from '../config';
import { mfetch } from '../helper';
import { useInputUsername } from '../hooks';
import { snackAlertError } from '../slices/mainSlice';
import { ButtonClose } from './Button';
import { Form, FormField } from './Form';
import { InputWithCount } from './Input';
import Modal from './Modal';

const RequestResetPassword = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const dispatch = useDispatch();

  const [username, handleUsernameChange] = useInputUsername(usernameMaxLength);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [hint, setHint] = useState('');

  
  const CAPTCHA_ENABLED = import.meta.env.VITE_CAPTCHASITEKEY ? true : false;
  const captchaRef = useRef<ReCAPTCHA>(null);
  const handleCaptchaVerify = (token: string | null) => {
    if (!token) {
      dispatch(snackAlertError(new Error('Empty captcha token')));
      return;
    }
    console.log("requesting reset with token");
    requestPasswordReset(username, token);
  };
  
  const requestPasswordReset = async (
    username: string,
    captchaToken?: string
  ) => {
    try {
      const res = await mfetch(`/api/users/${username}/reset_password?captchaToken=${captchaToken}`);
      if (!res.ok) {
        setUsernameError(null);
        const error = await res.json();
        setUsernameError(error.message)
        setHint('');
        dispatch(snackAlertError(error.message));
      } else {
        setUsernameError("");
        const emailHint = await res.json();
        setHint(`Reset email sent to ${emailHint.obfuscatedEmail}`);
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  }

  const handleCaptchaError = (error: unknown) => {
    dispatch(snackAlertError(error));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    let errFound = false;
    if (!username) {
      errFound = true;
      setUsernameError("No username provided.");
    } else if (username.length < 4) {
      errFound = true;
      setUsernameError("Username too short.");
    }

    if (errFound) {
      setHint('');
      return;
    }
    
    if (!CAPTCHA_ENABLED) {
      console.log("requesting reset withOUT token");
      requestPasswordReset(username);
      return;
    }
    if (!captchaRef.current) {
      dispatch(snackAlertError(new Error('captcha API not found')));
      console.log("not captcha current");
      return;
    }
    captchaRef.current.execute();
    console.log("finished captcharef");
  };



  return (
    <>
      <Helmet>
        <style>{`.grecaptcha-badge { visibility: hidden; }`}</style>
      </Helmet>
      <Modal open={open} onClose={onClose} noOuterClickClose={false}>
        <div className={clsx('modal-card')}>
          <div className="modal-card-head">
            <div className="modal-card-title">Reset password</div>
            <ButtonClose onClick={onClose} />
          </div>
          <Form className="modal-card-content" onSubmit={handleSubmit}>
            <FormField
              className="is-username"
              label="Username"
              description="Username to reset password."
              error={usernameError || undefined}
            >
              <InputWithCount
                maxLength={usernameMaxLength}
                value={username}
                onChange={handleUsernameChange}
                /*onBlur={() => checkUsernameExists()}*/
                autoFocus
                autoComplete="username"
                disabled={false}
              />
            </FormField>
            <FormField>
              <p>
                {hint}
              </p>
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
              <input type="submit" className="button button-main" value="Request password reset" />
            </FormField>
          </Form>
        </div>
      </Modal>
    </>
  );
};

RequestResetPassword.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RequestResetPassword;
