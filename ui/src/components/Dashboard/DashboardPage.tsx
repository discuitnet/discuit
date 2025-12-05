import clsx from 'clsx';

export interface DashboardPageProps {
  className?: string;
  title: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

function DashboardPage({ className, title, children, fullWidth = false }: DashboardPageProps) {
  return (
    <div className={clsx('dashboard-page', className)}>
      <div className="dashboard-page-title">{title}</div>
      <div className={clsx('dashboard-page-content', fullWidth && 'is-full-width')}>{children}</div>
    </div>
  );
}

export default DashboardPage;
