import clsx from 'clsx';

export interface DashboardPageProps {
  className?: string;
  title: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
  titleRightContent?: React.ReactNode;
}

function DashboardPage({
  className,
  title,
  children,
  fullWidth = false,
  titleRightContent,
}: DashboardPageProps) {
  return (
    <div className={clsx('dashboard-page', className)}>
      <div className="dashboard-page-title">
        <div className="left">{title}</div>
        <div className="right">{titleRightContent}</div>
      </div>
      <div className={clsx('dashboard-page-content', fullWidth && 'is-full-width')}>{children}</div>
    </div>
  );
}

export default DashboardPage;
