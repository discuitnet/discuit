import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { mfetchjson, toTitleCase, userGroupSingular } from '../../helper';
import { useIsMobile, useMuteCommunity, useMuteUser } from '../../hooks';
import { userHasSupporterBadge } from '../../pages/User';
import { saveToListModalOpened, snackAlertError } from '../../slices/mainSlice';
import { ButtonMore } from '../Button';
import Dropdown from '../Dropdown';
import TimeAgo from '../TimeAgo';
import { UserLink } from '../UserProPic';
import CommunityLink from './CommunityLink';

const PostCardHeadingDetails = ({
  post,
  userGroup,
  showEdited = false,
  showAuthorProPic = false,
  onRemoveFromList = null,
  compact = false,
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

  const dispatch = useDispatch();
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

  const handleHidePost = async () => {
    try {
      await mfetchjson('/api/hidden_posts', {
        method: 'POST',
        body: JSON.stringify({ postId: post.id }),
      });
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const isAuthorSupporter = userHasSupporterBadge(post.author);
  const isUsernameGhost = post.userDeleted && !viewerAdmin;

  return (
    <div className="post-card-heading-details">
      <div className="left">
        <CommunityLink name={post.communityName} proPic={post.communityProPic} />
        <div className="post-card-heading-by">
          <span>{compact ? null : 'Posted by '}</span>
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
              <button
                className="button-clear dropdown-item"
                onClick={() => dispatch(saveToListModalOpened(post.id, 'post'))}
              >
                Save to list
              </button>
              {onRemoveFromList && (
                <button
                  className="button-clear dropdown-item"
                  onClick={() => onRemoveFromList(post.id)}
                >
                  Remove from list
                </button>
              )}
              <button className="button-clear dropdown-item" onClick={handleHidePost}>
                Hide
              </button>
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
  onRemoveFromList: PropTypes.func,
  compact: PropTypes.bool,
};

export default PostCardHeadingDetails;
