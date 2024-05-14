import React from 'react';
import PropTypes from 'prop-types';
import { toTitleCase, userGroupSingular } from '../../helper';
import CommunityLink from './CommunityLink';
import TimeAgo from '../TimeAgo';
import { useIsMobile, useMuteCommunity, useMuteUser } from '../../hooks';
import Dropdown from '../Dropdown';
import { ButtonMore } from '../Button';
import { useSelector } from 'react-redux';
import { UserLink } from '../UserProPic';
import { userHasSupporterBadge } from '../../pages/User';

const PostCardHeadingDetails = ({
  post,
  userGroup,
  showEdited = false,
  showAuthorProPic = false,
}) => {
  // const userURL = `/@${post.username}`;
  userGroup = userGroup ?? post.userGroup;
  // Show if post was edited less than 5 mins ago.
  const showEditedSign =
    showEdited &&
    (post.editedAt ? new Date(post.editedAt) - new Date(post.createdAt) > 5 * 60000 : false);

  const viewer = useSelector((state) => state.main.user);
  const viewerAdmin = viewer ? viewer.isAdmin : false;
  const loggedIn = viewer !== null;

  const isMobile = useIsMobile();
  const isPinned = post.isPinned || post.isPinnedSite;

  // const dispatch = useDispatch();
  //
  // const isAuthorMuted = useSelector(selectIsUserMuted(post.userId));
  // const isCommunityMuted = useSelector(selectIsCommunityMuted(post.communityId));
  //
  // const handleMuteCommunity = () => {
  //   const f = isCommunityMuted ? unmuteCommunity : muteCommunity;
  //   dispatch(f(post.communityId, post.communityName));
  // };
  // const handleMuteUser = () => {
  //   const f = isAuthorMuted ? unmuteUser : muteUser;
  //   dispatch(f(post.userId, post.username));
  // };
  const { toggleMute: handleMuteUser, displayText: muteUserText } = useMuteUser({
    userId: post.userId,
    username: post.username,
  });

  const { toggleMute: handleMuteCommunity, displayText: muteCommunityText } = useMuteCommunity({
    communityId: post.communityId,
    communityName: post.communityName,
  });

  const isAuthorSupporter = userHasSupporterBadge(post.author);
  const isUsernameGhost = post.userDeleted && !viewerAdmin;

  return (
    <div className="post-card-heading-details">
      <div className="left">
        <CommunityLink name={post.communityName} proPic={post.communityProPic} />
        <div className="post-card-heading-by">
          <span>Posted by </span>
          <UserLink
            className={post.userDeleted && viewerAdmin ? 'is-red' : ''}
            username={isUsernameGhost ? 'Ghost' : post.username}
            proPic={post.author ? post.author.proPic : null}
            showProPic={showAuthorProPic}
            isSupporter={isAuthorSupporter}
            noLink={isUsernameGhost}
            proPicGhost={post.userDeleted}
          />
          {userGroup !== 'normal' && (
            <span className="post-card-heading-user-group">{` ${toTitleCase(
              userGroupSingular(userGroup)
            )}`}</span>
          )}
        </div>
        <TimeAgo className="post-card-heading-ago" time={post.createdAt} short={isMobile} />
        {showEditedSign && (
          <TimeAgo
            className="post-card-heading-ago"
            time={post.editedAt}
            prefix="Edited "
            suffix=""
            short
          />
        )}
        {isPinned && <div className="post-card-heading-pinned">Pinned</div>}
      </div>
      <div className="right">
        {loggedIn && (
          <Dropdown target={<ButtonMore />} aligned="right">
            <div className="dropdown-list">
              <button className="button-clear dropdown-item" onClick={handleMuteCommunity}>
                {muteCommunityText}
              </button>
              {!post.userDeleted && (
                <button className="button-clear dropdown-item" onClick={handleMuteUser}>
                  {muteUserText}
                </button>
              )}
              <button className="button-clear dropdown-item">Save to list</button>
            </div>
          </Dropdown>
        )}
      </div>
      {/*<div className="right">172k views</div>*/}
    </div>
  );
};

PostCardHeadingDetails.propTypes = {
  post: PropTypes.object.isRequired,
  userGroup: PropTypes.string,
  showEdited: PropTypes.bool,
  showAuthorProPic: PropTypes.bool,
};

export default PostCardHeadingDetails;
