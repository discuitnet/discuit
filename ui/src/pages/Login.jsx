import React from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom/cjs/react-router-dom.min';
import LoginForm from '../views/LoginForm';

const Login = () => {
  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const handleSuccess = () => {};

  if (loggedIn) {
    return <Redirect to="/" />;
  }

  return (
    <div className="page-content page-login wrap">
      <div className="card login-card">
        <div className="title">Login to continue</div>
        <LoginForm onSucces={handleSuccess} />
      </div>
    </div>
  );
};

export default Login;
