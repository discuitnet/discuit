import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Community } from '../../serverTypes';
import CommunityProPic from '../CommunityProPic';

export interface CommunityLinkProps {
  className?: string;
  target?: HTMLAnchorElement['target'];
  name: string;
  proPic?: Community['proPic'];
  noLink?: boolean;
}

const CommunityLink = ({
  className,
  target = '_self',
  name,
  proPic,
  noLink = false,
}: CommunityLinkProps) => {
  const children = [
    <CommunityProPic proPic={proPic || null} name={name} key="1" />,
    <span key="2">{name}</span>,
  ];
  const _className = clsx('community-link', className);
  if (noLink) {
    return <div className={_className}>{children}</div>;
  } else {
    return (
      <Link className={_className} to={`/${name}`} target={target}>
        {children}
      </Link>
    );
  }
};

export default CommunityLink;
