import PropTypes from 'prop-types';
import React from 'react';
import PageLoading from '../components/PageLoading';
import NotFound from './NotFound';

const PageNotLoaded = ({ loading }) => {
  switch (loading) {
    case 'loading':
      return <PageLoading />;
    case 'notfound':
      return <NotFound />;
  }
  return <PageLoading />;
};

PageNotLoaded.propTypes = {
  loading: PropTypes.string.isRequired,
};

export default PageNotLoaded;
