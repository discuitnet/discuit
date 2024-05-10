import React from 'react';
import { useParams } from 'react-router-dom';

const Lists = () => {
  const { username } = useParams();

  return (
    <div className="page-content page-lists">
      <h1>Lists of: {username}</h1>
    </div>
  );
};

export default Lists;
