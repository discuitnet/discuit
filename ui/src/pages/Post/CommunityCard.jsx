import React from 'react';
import PropTypes from 'prop-types';
import ShowMoreBox from '../../components/ShowMoreBox';
import MarkdownBody from '../../components/MarkdownBody';
import JoinButton from '../Community/JoinButton';
import { stringCount } from '../../helper';
import Link from '../../components/Link';
import CommunityProPic from '../../components/CommunityProPic';

const CommunityCard = ({ community }) => {
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
          <ShowMoreBox showButton maxHeight="250px">
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

CommunityCard.propTypes = {
  community: PropTypes.object.isRequired,
};

export default CommunityCard;
