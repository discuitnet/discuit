import CommunityProPic from '../../components/CommunityProPic';
import Link from '../../components/Link';
import MarkdownBody from '../../components/MarkdownBody';
import ShowMoreBox from '../../components/ShowMoreBox';
import { stringCount } from '../../helper';
import { Community } from '../../serverTypes';
import JoinButton from '../Community/JoinButton';

const CommunityCard = ({ community }: { community: Community }) => {
  const { name } = community;
  const communityURL = `/${name}`;

  return (
    <div className="card card-sub about-community">
      <div className="about-comm-head">
        <Link to={communityURL} className="about-comm-top">
          <div className="about-comm-profile">
            <CommunityProPic name={community.name} proPic={community.proPic} size="large" />
          </div>
          <div className="about-comm-head-right">
            <div className="about-comm-name">{name}</div>
            <div className="about-comm-no-members">
              {stringCount(community.noMembers, false, 'member')}
            </div>
          </div>
        </Link>
        <div className="about-comm-desc">
          <ShowMoreBox showButton maxHeight="250px" childrenHash={community.about || ''}>
            <MarkdownBody>{community.about}</MarkdownBody>
          </ShowMoreBox>
        </div>
        <div className="about-comm-join">
          <JoinButton community={community} />
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;
