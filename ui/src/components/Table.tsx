import clsx from 'clsx';

export interface TableRowArgs extends React.HTMLAttributes<HTMLDivElement> {
  columns: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function TableRow({ columns, className, children, style, ...props }: TableRowArgs) {
  const _style = style ?? {};
  return (
    <div
      className={clsx('table-row', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, ..._style }}
      {...props}
    >
      {children}
    </div>
  );
}
