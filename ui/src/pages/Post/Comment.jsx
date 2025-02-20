/* eslint-disable react/display-name */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Dropdown from '../../components/Dropdown';
import MarkdownBody from '../../components/MarkdownBody';
import ModalConfirm from '../../components/Modal/ModalConfirm';
import ReportModal from '../../components/ReportModal';
import ShowMoreBox from '../../components/ShowMoreBox';
import TimeAgo from '../../components/TimeAgo';
import UserProPic, { GhostUserProPic, UserLink } from '../../components/UserProPic';
import { LinkOrDiv } from '../../components/Utils';
import { kRound, mfetchjson, stringCount, toTitleCase, userGroupSingular } from '../../helper';
import { useVoting } from '../../hooks';
import { newCommentAdded, replyCommentsAdded } from '../../slices/commentsSlice';
import { countChildrenReplies } from '../../slices/commentsTree';
import {
  loginPromptToggled,
  saveToListModalOpened,
  snackAlert,
  snackAlertError,
} from '../../slices/mainSlice';
import { userHasSupporterBadge } from '../User';
import AddComment from './AddComment';
import CommentShareButton, { CommentShareDropdownItems } from './CommentShareButton';

const Diagnostics = false; // import.meta.env.MODE !== 'production';
const MaxCommentDepth = 15;

const Comment = ({
  post,
  user = null,
  community,
  zIndex,
  focusId,
  node,
  isMobile = false,
  isAdmin,
  isBanned,
  canVote,
  canComment,
}) => {
  const dispatch = useDispatch();

  const postId = post.publicId;
  const loggedIn = user !== null;

  const { noRepliesRendered, children } = node;
  const [comment, _setComment] = useState(node.comment);
  const setComment = (comment) => {
    // Beware: In place data mutation.
    node.comment = {
      ...node.comment,
      ...comment,
    };
    _setComment((c) => {
      return {
        ...c,
        ...comment,
      };
    });
  };

  const commentShareURL = `/${community.name}/post/${postId}/${comment.id}`;

  const deleted = comment.deletedAt !== null;

  // If purged if true, then the deleted comment's content (body, author, etc)
  // is not available (in which case the comment was deleted by its author). If
  // purged is false and deleted is true, then the comment was deleted by either
  // an admin or a mod of the community *and* the person viewing the comment
  // right now, the logged in user, has the privilege to view this comment.
  const purged = deleted && comment.contentStripped;

  const [selection, setSelection] = useState('');
  const [isReplying, _setIsReplying] = useState(false);

  const openReplyBox = () => _setIsReplying(true);
  const closeReplyBox = () => {
    _setIsReplying(false);
    setSelection('');
  };

  const handleOnReply = () => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }
    const sel = document.getSelection();
    if (sel) {
      const text = sel.toString();
      if (text) setSelection(text);
    }
    openReplyBox();
  };
  const handleAddCommentSuccess = (newComment) => {
    closeReplyBox();
    if (!newComment.author) {
      newComment.author = user;
    }
    dispatch(newCommentAdded(postId, newComment));
  };

  const [isEditing, setIsEditing] = useState(false);
  const handleOnEdit = () => setIsEditing(true);
  const handleEditCommentSuccess = (newComment) => {
    setIsEditing(false);
    setComment(newComment);
  };

  const [deleteAs, setDeleteAs] = useState('normal');
  const [confirmDeleteOpen, _setConfirmDeleteOpen] = useState(false);
  const setConfirmDeleteOpen = (newConfirm, deleteAs = 'normal') => {
    if (newConfirm === false) {
      setDeleteAs('normal');
    } else {
      setDeleteAs(deleteAs);
    }
    _setConfirmDeleteOpen(newConfirm);
  };
  const handleOnDelete = async () => {
    try {
      const rcomm = await mfetchjson(
        `/api/posts/${comment.postId}/comments/${comment.id}?deleteAs=${deleteAs}`,
        {
          method: 'DELETE',
        }
      );
      _setComment(rcomm);
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const { upvotes, downvotes, vote, doVote } = useVoting(
    comment.userVoted ? (comment.userVotedUp ? true : false) : null,
    comment.upvotes,
    comment.downvotes
  );
  const handleVote = (up = true) => {
    if (!loggedIn) {
      dispatch(loginPromptToggled());
      return;
    }
    if (deleted) {
      dispatch(snackAlert("Can't vote on a deleted comment!", 'novotedeleted'));
      return;
    }
    doVote(
      up,
      async () =>
        mfetchjson('/api/_commentVote', {
          method: 'POST',
          body: JSON.stringify({
            commentId: comment.id,
            up,
          }),
        }),
      (rComment) => {
        setComment(rComment);
      },
      (error) => {
        dispatch(snackAlertError(error));
      }
    );
  };

  const [userGroup, setUserGroup] = useState(comment.userGroup);
  useEffect(() => {
    if (comment.userGroup === userGroup) return;
    (async () => {
      try {
        const rcomm = await mfetchjson(
          `/api/posts/${comment.postId}/comments/${comment.id}?action=changeAsUser&userGroup=${userGroup}`,
          {
            method: 'PUT',
          }
        );
        setComment(rcomm);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [userGroup]);

  const [collapsed, setCollapsed] = useState(node.collapsed || false);
  const collapsedRef = useRef(null);
  useEffect(() => {
    const navBarHeight = 100; // roughly
    if (collapsed && collapsedRef.current !== null) {
      const { y } = collapsedRef.current.getBoundingClientRect();
      if (y < navBarHeight) {
        window.scrollTo({
          left: window.scrollX,
          top: y - navBarHeight + window.pageYOffset,
        });
      }
    }
  }, [collapsed]);
  const handleCollapse = (collapsed) => {
    node.collapsed = collapsed;
    setCollapsed(collapsed);
  };
  useEffect(() => {
    if (comment.isAuthorMuted) {
      setCollapsed(true);
    }
  }, []);

  const [isRepliesLoading, setIsRepliesLoading] = useState(false);
  const handleLoadReplies = async () => {
    if (isRepliesLoading) return;
    try {
      setIsRepliesLoading(true);
      const newComments = await mfetchjson(`/api/posts/${postId}/comments?parentId=${comment.id}`);
      dispatch(replyCommentsAdded(postId, newComments));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsRepliesLoading(false);
    }
  };

  const div = useRef();
  const focused = focusId === comment.id;
  useEffect(() => {
    if (focused && div.current) {
      const pos =
        document.documentElement.scrollTop + div.current.getBoundingClientRect().top - 100;
      window.scrollTo(0, pos);
    }
  }, [focused, focusId]);

  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const highlighted = (() => {
    const ts = new Date(comment.createdAt).getTime() / 1000,
      from = parseInt(params.get('highlightFrom')),
      to = parseInt(params.get('highlightTo'));
    if (isNaN(to)) {
      return ts >= from;
    }
    return ts >= from && ts <= to;
  })();

  const [reportModalOpen, setReportModalOpen] = useState(false); // for mobile

  const [mutedUserHidden, setMutedUserHidden] = useState(comment.isAuthorMuted);
  const mutedText = "You've muted this user. Click here to see this comment.";
  const handleCommentTextClick = () => {
    if (mutedUserHidden) {
      setMutedUserHidden(false);
    }
  };

  const isOP = (() => {
    const postAuthorId = post.userDeleted ? post.userGhostId : post.userId;
    const commentAuthorId = comment.userDeleted ? comment.userGhostId : comment.userId;
    return postAuthorId === commentAuthorId;
  })();
  const isUsernameHidden = purged || mutedUserHidden || (comment.userDeleted && !isAdmin);
  let username = comment.username;
  if (isUsernameHidden) {
    if (comment.isAuthorMuted) {
      username = 'Muted';
    } else if (comment.userDeleted) {
      username = 'Ghost';
    } else {
      username = 'Hidden';
    }
  }

  if (Diagnostics) console.log('Comment rendering.');

  const showAuthorProPic = user ? !user.hideUserProfilePictures : true;
  const proPicRef = useRef(null);
  const renderAuthorProPic = () => {
    if (!showAuthorProPic) {
      return (
        <div className="post-comment-collapse-minus" onClick={() => handleCollapse(true)}>
          {/* collapse icon only */}
        </div>
      );
    }
    if (!comment.userDeleted && comment.author) {
      const { author } = comment;
      return (
        <div
          className="post-comment-propic"
          ref={proPicRef}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <div
            className="collapse-icon-wrapper"
            onClick={() => handleCollapse(collapsed ? false : true)}
          >
            {/* COLLAPSE WAS HERE */}
          </div>
          <LinkOrDiv
            href={`/@${author.username}`}
            isLink={!collapsed}
            target="_self"
            useReactRouter
          >
            <UserProPic username={author.username} proPic={author.proPic} />
          </LinkOrDiv>
        </div>
      );
    }
    return (
      <div
        className="post-comment-propic"
        ref={proPicRef}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <div
          className="post-comment-collapse-minus mobile-collapse-icon"
          onClick={() => handleCollapse(true)}
          style={{
            width: '18px',
            height: '18px',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
          }}
        ></div>
        <GhostUserProPic />
      </div>
    );
  };
  const renderAuthorUsername = () => {
    // On mobile, render the profile picture. On desktop, render only the
    // username.
    return (
      <UserLink
        className={
          'post-comment-username' +
          (isUsernameHidden ? ' is-hidden' : '') +
          (comment.userDeleted && !isUsernameHidden ? ' is-red' : '')
        }
        username={username}
        proPic={comment.author ? comment.author.proPic : null}
        proPicGhost={isUsernameHidden}
        showProPic={isMobile && showAuthorProPic}
        isSupporter={isAuthorSupporter}
        noAtSign
        noLink={isUsernameHidden}
      />
    );
  };

  const isAuthorSupporter = userHasSupporterBadge(comment.author);
  const topDivClassname = 'post-comment' + (showAuthorProPic ? ' has-propics' : '');
  if (collapsed) {
    return (

      <div
        ref={collapsedRef}
        className={topDivClassname + ' is-collapsed'}
        onClick={() => handleCollapse(false)}
      >
        <div
          className="post-comment-head-item post-comment-collapse-minus new-collapse-icon is-plus"
          onClick={() => handleCollapse(true)}
          style={{
            width: '14px',
            height: '14px',
            transform: 'translateY(6px) translateX(-6px)',
            aspectRatio: '1',
            display: isMobile ? 'none' : 'flex', // Hide in mobile view
            alignItems: 'center',
          }}
        ></div>
        <div className="post-comment-left">

          <div className="post-comment-collapse">{renderAuthorProPic()}</div>

        </div>
        <div className="post-comment-body">
          <div className="post-comment-body-head">
            {renderAuthorUsername()}
            {isOP && (
              <div className="post-comment-head-item post-comment-is-op" title="Original poster">
                OP
              </div>
            )}
            <TimeAgo
              className="post-comment-head-item is-no-m"
              time={comment.createdAt}
              short={isMobile}
            />
            {/*<div className="post-comment-head-item">{`${kRound(points)} ${stringCount(
              points,
              true,
              'point'
            )}`}</div>*/}
            <div className="post-comment-head-item">
              {stringCount(comment.noReplies, false, 'reply', 'replies')}
            </div>
            {/* {!deleted && comment.userGroup !== 'normal' && (
              <div className="post-comment-head-item post-comment-user-group">
                {`${toTitleCase(userGroupSingular(comment.userGroup))}`}
              </div>
            )} */}
            <div
              className="post-comment-head-item post-comment-collapse-minus is-plus"
              onClick={() => handleCollapse(false)}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    dispatch(saveToListModalOpened(comment.id, 'comment'));
  };

  const upCls = {};
  const downCls = {};
  if (vote === true) {
    upCls.color = 'var(--color-voted)';
    upCls.background = 'rgba(var(--base-brand), 0.2)';
  } else if (vote === false) {
    downCls.color = 'var(--color-voted-down)';
    downCls.background = 'rgba(var(--base-brand), 0.2)';
  }

  const userMod = community ? community.userMod : false;

  let deletedText = '';
  if (deleted) deletedText = `Deleted by ${userGroupSingular(comment.deletedAs, true)}`;
  const disabled = !(canVote && !comment.deletedAt);
  const noRepliesRenderedDirect = children ? children.length : 0;
  const noChildrenReplies = countChildrenReplies(node);
  const noMoreComments = comment.noReplies - noChildrenReplies;
  const showEditDelete = loggedIn && !deleted && user.id === comment.userId;
  const showReport = loggedIn && !deleted && user.id !== comment.userId;
  // const commentShareURL = `/${community.name}/post/${postId}?focus=${comment.id}#${comment.id}`;

  const getModActionsItems = (disabled = false) => {
    const checkboxId = `ch-mods-${comment.id}`;
    const cls = (str = '') => {
      return 'dropdown-item' + (disabled ? ' is-disabled' : '') + (str ? ` ${str}` : '');
    };
    return (
      <>
        <div className={cls()} onClick={() => !disabled && setConfirmDeleteOpen(true, 'mods')}>
          Delete
        </div>
        {user.id === comment.userId && (
          <div className={cls('is-non-reactive')}>
            <div className="checkbox">
              <input
                id={checkboxId}
                type="checkbox"
                checked={comment.userGroup === 'mods' ? true : false}
                onChange={(e) => !disabled && setUserGroup(e.target.checked ? 'mods' : 'normal')}
                disabled={disabled}
              />
              <label htmlFor={checkboxId}>Speaking officially</label>
            </div>
          </div>
        )}
      </>
    );
  };

  const getAdminActionsItems = () => {
    const checkboxId = `ch-admins-${comment.id}`;
    return (
      <>
        <div className="dropdown-item" onClick={() => setConfirmDeleteOpen(true, 'admins')}>
          Delete
        </div>
        {user.id === comment.userId && (
          <div className="dropdown-item is-non-reactive">
            <div className="checkbox">
              <input
                id={checkboxId}
                type="checkbox"
                checked={comment.userGroup === 'admins' ? true : false}
                onChange={(e) => setUserGroup(e.target.checked ? 'admins' : 'normal')}
              />
              <label htmlFor={checkboxId}>Speaking officially</label>
            </div>
          </div>
        )}
        <div className="dropdown-item" onClick={() => alert(`ID: ${comment.id}`)}>
          Comment ID
        </div>
      </>
    );
  };

  const showEditedSign = comment.editedAt
    ? new Date(comment.editedAt) - new Date(comment.createdAt) > 5 * 60000
    : false; // show if comment was edited less than 5 mins ago

  const style = {
    zIndex,
  };

  const handleLineClick = (e) => {
    if (proPicRef.current) {
      if (proPicRef.current.contains(e.target)) {
        return;
      }
    }
    handleCollapse(true);
  };

  return (
    <div
      className={topDivClassname + ` is-depth-${comment.depth}`}
      style={style}
      id={comment.id}
      ref={div}
    >
      <ModalConfirm
        title="Delete comment?"
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleOnDelete}
      >
        Are you sure you want to delete the comment?
      </ModalConfirm>
      <div

        className="post-comment-head-item post-comment-collapse-minus new-collapse-icon"
        onClick={() => handleCollapse(true)}
        style={{
          width: '14px',
          height: '14px',

          transform: 'translateY(6px) translateX(-6px)',

          aspectRatio: '1',
          display: isMobile ? 'none' : 'flex', // Hide in mobile view
          alignItems: 'center',
        }}
      ></div>

      <div className="post-comment-left">

        <div className="post-comment-collapse" onClick={handleLineClick}>

          {renderAuthorProPic()}
          <div className="post-comment-line"></div>
        </div>
      </div>

      <div className="post-comment-body">
        <div className="post-comment-body-head">
          {renderAuthorUsername()}
          {isOP && (
            <div className="post-comment-head-item post-comment-is-op" title="Original poster">
              OP
            </div>
          )}
          <TimeAgo className="post-comment-head-item" time={comment.createdAt} short={isMobile} />
          {!purged && ['normal', 'null'].find((v) => v === comment.userGroup) === undefined && (
            <div className="post-comment-head-item post-comment-user-group">
              {`${toTitleCase(userGroupSingular(comment.userGroup, isMobile))}`}
            </div>
          )}
          {showEditedSign && (
            <TimeAgo
              className="post-comment-head-item"
              time={comment.editedAt}
              prefix="Edited "
              suffix=""
              short
            />
          )}
          <div
            className="post-comment-head-item post-comment-collapse-minus"
            onClick={() => handleCollapse(true)}
          ></div>
        </div>
        {isEditing && (
          <AddComment
            post={post}
            postId={comment.postId}
            id={comment.id}
            onSuccess={handleEditCommentSuccess}
            onCancel={() => setIsEditing(false)}
            commentBody={comment.body}
            editing
          />
        )}
        {!isEditing && (
          <div
            className={
              'post-comment-text' +
              (focused || highlighted ? ' is-focused' : '') +
              (deleted && !purged ? ' is-red' : '')
            }
            onClick={handleCommentTextClick}
            style={{
              opacity: mutedUserHidden ? 0.8 : 1,
              cursor: mutedUserHidden ? 'pointer' : 'auto',
            }}
          >
            {!purged && (
              <ShowMoreBox showButton maxHeight="500px">
                <MarkdownBody>{mutedUserHidden ? mutedText : comment.body}</MarkdownBody>
              </ShowMoreBox>
            )}
            {deleted && <div className="post-comment-text-sign">{deletedText}</div>}
          </div>
        )}
        {Diagnostics && (
          <div className="post-comment-diagnostics">
            <div>{`ID: ${comment.id}`}</div>
            <div>{`NoReplies: ${comment.noReplies}`}</div>
            <div>{`NoRendered: ${noRepliesRendered}`}</div>
            <div>{`NoRepliesDirect: ${comment.noRepliesDirect}`}</div>
            <div>{`NoRenderedDirect: ${noRepliesRenderedDirect}`}</div>
          </div>
        )}
        <div className="post-comment-buttons" style={{ position: 'relative', zIndex: 2000000 }}>
          <button
            className="button-text post-comment-buttons-vote is-up"
            style={upCls}
            disabled={disabled}
            onClick={() => handleVote(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="m19.707 9.293-7-7a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 5 11h3v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V11h3a1 1 0 0 0 .707-1.707z"
                fill="currentColor"
                data-name="Up"
              />
            </svg>
          </button>
          <div className={'post-comment-points' + (deleted ? ' is-grayed' : '')}>
            {kRound(upvotes)}
          </div>
          <button
            className="button-text post-comment-buttons-vote is-down"
            style={downCls}
            disabled={disabled}
            onClick={() => handleVote(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="m19.707 9.293-7-7a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 5 11h3v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V11h3a1 1 0 0 0 .707-1.707z"
                fill="currentColor"
                data-name="Up"
              />
            </svg>
          </button>
          <div className="post-comment-points is-grayed">{kRound(downvotes)}</div>
          {!deleted && (
            <button
              className="button-text"
              onClick={handleOnReply}
              title={comment.depth === MaxCommentDepth ? 'Thread too deep.' : ''}
              disabled={!canComment || comment.depth === MaxCommentDepth}
            >
              Reply
            </button>
          )}
          {!deleted && isMobile && (
            <>
              {showReport && (
                <ReportModal
                  open={reportModalOpen}
                  onClose={() => setReportModalOpen(false)}
                  target={comment}
                  targetType="comment"
                  disabled={isBanned}
                  noButton
                />
              )}
              <Dropdown target={<button className="button-text">More</button>}>
                <div className="dropdown-list">
                  <CommentShareDropdownItems url={commentShareURL} />
                  {showEditDelete && (
                    <>
                      <div className="dropdown-item" onClick={handleOnEdit}>
                        Edit
                      </div>
                      <div className="dropdown-item" onClick={() => setConfirmDeleteOpen(true)}>
                        Delete
                      </div>
                    </>
                  )}
                  {showReport && (
                    <div className="dropdown-item" onClick={() => setReportModalOpen(true)}>
                      Report
                    </div>
                  )}
                  {loggedIn && (
                    <div className="dropdown-item" onClick={handleSave}>
                      Save to list
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <div className="dropdown-item is-topic">Admin actions</div>
                      {getAdminActionsItems()}
                    </>
                  )}
                  {(isAdmin || userMod) && (
                    <>
                      <div className="dropdown-item is-topic">Mod actions</div>
                      {getModActionsItems(!userMod)}
                    </>
                  )}
                </div>
              </Dropdown>
            </>
          )}
          {!deleted && !isMobile && (
            <>
              <CommentShareButton url={commentShareURL} prefix="Share via " />
              {showEditDelete && (
                <>
                  <button className="button-text" onClick={handleOnEdit}>
                    Edit
                  </button>
                  <button className="button-text" onClick={() => setConfirmDeleteOpen(true)}>
                    Delete
                  </button>
                </>
              )}
              {showReport && (
                <ReportModal target={comment} targetType="comment" disabled={isBanned} />
              )}
              {loggedIn && (
                <button className="button-text" onClick={handleSave}>
                  Save
                </button>
              )}
              {isAdmin && (
                <Dropdown
                  target={
                    <button className="button-text" style={{ color: 'var(--color-red)' }}>
                      Admin actions
                    </button>
                  }
                >
                  <div className="dropdown-list">{getAdminActionsItems()}</div>
                </Dropdown>
              )}
              {isAdmin && !userMod && (
                <button className="button-text" style={{ color: 'rgb(var(--base-6))' }}>
                  Mod actions
                </button>
              )}
              {userMod && (
                <Dropdown
                  target={
                    <button className="button-text" style={{ color: 'var(--color-red)' }}>
                      Mod actions
                    </button>
                  }
                >
                  <div className="dropdown-list">{getModActionsItems()}</div>
                </Dropdown>
              )}
            </>
          )}
        </div>
        {loggedIn && isReplying && canComment && (
          <AddComment
            isMod={userMod}
            post={post}
            parentCommentId={comment.id}
            onSuccess={handleAddCommentSuccess}
            onCancel={closeReplyBox}
            textSelection={selection}
          />
        )}
        {children &&
          children.map((n, i) => (
            <Comment
              post={post}
              user={user}
              community={community}
              key={n.comment.id}
              zIndex={1000000 - i}
              focusId={focusId}
              node={n}
              isMobile={isMobile}
              isAdmin={isAdmin}
              isBanned={isBanned}
              canVote={canVote}
              canComment={canComment}
            />
          ))}
        {noMoreComments > 0 && (
          <button
            className="button-clear button-link post-comment-more"
            onClick={handleLoadReplies}
            disabled={isRepliesLoading}
          >
            {isRepliesLoading ? 'loading...' : `${noMoreComments} more replies`}
          </button>
        )}
      </div>
    </div>
  );
};

Comment.propTypes = {
  post: PropTypes.object.isRequired,
  user: PropTypes.object,
  zIndex: PropTypes.number.isRequired,
  community: PropTypes.object,
  focusId: PropTypes.string,
  node: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  isRoot: PropTypes.bool,
  isAdmin: PropTypes.bool.isRequired,
  isBanned: PropTypes.bool.isRequired,
  canVote: PropTypes.bool.isRequired,
  canComment: PropTypes.bool.isRequired,
};

export default Comment;

export const MemorizedComment = React.memo(Comment);