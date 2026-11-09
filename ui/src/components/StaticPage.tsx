import clsx from 'clsx';
import React, { useEffect } from 'react';
import Footer from './Footer';
import PageTitle from './PageTitle';

interface StaticPageProps extends React.HTMLAttributes<HTMLDivElement> {
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
      <PageTitle title={title} />
      {noWrap ? <>{children}</> : <div className="wrap">{children}</div>}
      <Footer />
    </div>
  );
};

export default StaticPage;
