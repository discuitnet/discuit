import clsx from 'clsx';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from './Footer';

export interface StaticPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  noWrap?: boolean;
}

const StaticPage = ({ className, children, title, noWrap = false, ...props }: StaticPageProps) => {
  useEffect(() => {
    document.body.classList.add('is-not-gray');
    return () => {
      document.body.classList.remove('is-not-gray');
    };
  }, []);
  return (
    <div className={clsx('page-content page-static', className)} {...props}>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      {noWrap ? <>{children}</> : <div className="wrap">{children}</div>}
      <Footer />
    </div>
  );
};

export default StaticPage;
