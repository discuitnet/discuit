import { Link } from 'react-router';
import Sidebar from '../components/Sidebar';
import { useRemoveCanonicalTag } from '../hooks';
import PageTitle from '../components/PageTitle';

const NotFound = () => {
  useRemoveCanonicalTag();
  return (
    <div className="page-content page-notfound">
      <PageTitle title="404: Not Found" />
      <meta name="robots" content="noindex" />
      <Sidebar />
      <h1>404: Not found!</h1>
      <p>{"The page you're looking for does not exist."}</p>
      <Link to="/">Go home.</Link>
    </div>
  );
};

export default NotFound;
