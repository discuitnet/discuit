import { Link } from 'react-router';

export default function Forbidden() {
  return (
    <div className="page-content page-full">
      <h1>Forbidden!</h1>
      <div>
        <Link to="/">Go home</Link>.
      </div>
    </div>
  );
}
