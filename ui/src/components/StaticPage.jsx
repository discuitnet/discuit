import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import Footer from './Footer';

const StaticPage = ({ className, children, title, noWrap = false, ...props }) => {
  useEffect(() => {
    document.body.classList.add('is-not-gray');
    return () => {
      document.body.classList.remove('is-not-gray');
    };
  }, []);
  return (
    <div className={'page-content page-static' + (className ? ` ${className}` : '')} {...props}>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      {noWrap ? <>{children}</> : <div className="wrap">{children}</div>}
      <Footer />
    </div>
  );
};

StaticPage.propTypes = {
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]).isRequired,
  title: PropTypes.string,
  noWrap: PropTypes.bool,
  description: PropTypes.string,
};

export default StaticPage;
