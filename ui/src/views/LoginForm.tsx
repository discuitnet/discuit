import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Form, FormField } from '../components/Form';
import Input, { InputPassword } from '../components/Input';
import { APIError, mfetch } from '../helper';
import { loginModalOpened, signupModalOpened, snackAlertError } from '../slices/mainSlice';

const LoginForm = ({ isModal = false }: { isModal?: boolean }) => {
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  useEffect(() => {
    setLoginError(null);
  }, [username, password]);
  const handleLoginSubmit: React.FormEventHandler = async (event) => {
    event.preventDefault();
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
      const res = await mfetch('/api/_login', {
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

  const usernameRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === '/login') {
      usernameRef.current?.focus();
    }
  }, [pathname]);

  const handleOnSignup: React.MouseEventHandler = (event) => {
    event.preventDefault();
    dispatch(loginModalOpened(false));
    dispatch(signupModalOpened());
  };

  return (
    <Form className="login-box modal-card-content" onSubmit={handleLoginSubmit}>
      <FormField label="Username">
        <Input
          ref={usernameRef}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus={isModal}
          autoComplete="username"
        />
      </FormField>
      <FormField label="Password">
        <InputPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </FormField>
      {loginError && (
        <FormField>
          <div className="form-error text-center">{loginError}</div>
        </FormField>
      )}
      <FormField className="is-submit">
        <input type="submit" className="button button-main" value="Login" />
        <button className="button-link" onClick={handleOnSignup}>
          {"Don't have an account? Signup"}
        </button>
      </FormField>
    </Form>
  );
};

export default LoginForm;
