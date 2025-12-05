import clsx from 'clsx';

export interface DashboardPageProps {
  title: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

function DashboardPage({ title, children, fullWidth = false }: DashboardPageProps) {
  return (
    <div className={clsx('dashboard-page')}>
      <div className="dashboard-page-title">{title}</div>
      <div className={clsx('dashboard-page-content', fullWidth && 'is-full-width')}>{children}</div>
    </div>
  );
}

export default DashboardPage;
