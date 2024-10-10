import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useRemoveCanonicalTag } from '../hooks';

const NotFound = () => {
  useRemoveCanonicalTag();
  return (
    <div className="page-content page-notfound">
      <Helmet>
        <title>404: Not Found</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Sidebar />
      <h1>404: Not found!</h1>
      <p>{"The page you're looking for does not exist."}</p>
      <Link to="/">Go home.</Link>
    </div>
  );
};

export default NotFound;
