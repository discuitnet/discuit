import { useLinkClick } from '../hooks';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  children?: React.ReactNode;
}

function Link({ to, replace = false, children, onClick, target, ...props }: LinkProps) {
  const handleClick = useLinkClick(to, onClick, target, replace);
  return (
    <a href={to} onClick={handleClick} target={target} {...props}>
      {children}
    </a>
  );
}

export default Link;
