import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { MainState } from '../slices/mainSlice';
import { RootState } from '../store';
import LoginForm from '../views/LoginForm';

const Login = () => {
  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];
  const loggedIn = user !== null;

  if (loggedIn) {
    return <Redirect to="/" />;
  }

  return (
    <div className="page-content page-login wrap">
      <div className="card login-card">
        <div className="title">Login to continue</div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
