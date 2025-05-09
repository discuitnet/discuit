import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import Dropdown from '../../components/Dropdown';
import MiniFooter from '../../components/MiniFooter';
import PostVotes from '../../components/PostCard/PostVotes';
import ReportModal from '../../components/ReportModal';
import Sidebar from '../../components/Sidebar';
import {
  mfetch,
  mfetchjson,
  omitWWWFromHostname,
  stringCount,
  userGroupSingular,
} from '../../helper';
import { useIsMobile } from '../../hooks';
import { saveToListModalOpened, snackAlert, snackAlertError } from '../../slices/mainSlice';
import PageNotLoaded from '../PageNotLoaded';
import AddComment from './AddComment';
import CommentSection from './CommentSection';
import PostDeleteModal, { PostContentDeleteModal } from './PostDeleteModal';
import PostShareButton from './PostShareButton';
// import CommentsSortButton from './CommentsSortButton';
import { useLocation } from 'react-router-dom';
import MarkdownBody from '../../components/MarkdownBody';
import { getEmbedComponent } from '../../components/PostCard';
import LinkImage from '../../components/PostCard/LinkImage';
import PostCardHeadingDetails from '../../components/PostCard/PostCardHeadingDetails';
import PostImageGallery from '../../components/PostImageGallery';
import Spinner from '../../components/Spinner';
import { ExternalLink, LinkOrDiv } from '../../components/Utils';
import { commentsAdded, newCommentAdded } from '../../slices/commentsSlice';
import { communityAdded } from '../../slices/communitiesSlice';
import { postAdded } from '../../slices/postsSlice';
import { SVGExternalLink } from '../../SVGs';
import CommunityCard from './CommunityCard';
import PostImage from './PostImage';
import PostVotesBar from './PostVotesBar';

const Post = () => {
  const { id, commentId, communityName } = useParams(); // id is post.publicId

  const dispatch = useDispatch();
  const history = useHistory();

  const location = useLocation();
  const fromNotifications = Boolean(location.state ? location.state.fromNotifications : false);

  const user = useSelector(
    (state) => state.main.user,
    () => true
  ); // select only once
  const post = useSelector((state) => state.posts.items[id]);
  const comments = useSelector((state) => state.comments.items[id]);
  const community = useSelector((state) => {
    if (post) {
      return state.communities.items[post.communityName];
    }
    return state.communities.items[communityName];
  });

  const [postLoading, setPostLoading] = useState(post ? 'loaded' : 'loading');
  const shouldCommentsLoad = () => {
    if (!(comments && post)) return true;
    const isPop = history.action === 'POP';
    if (fromNotifications) return !isPop;
    if (post.fetchedAt > comments.fetchedAt) return !isPop;
    return false;
  };
  const [commentsLoading, setCommentsLoading] = useState(
    shouldCommentsLoad() ? 'loading' : 'loaded'
  );
  const [communityLoading, setCommunityLoading] = useState(community ? 'loaded' : 'loading');
  useEffect(() => {
    if (post && !shouldCommentsLoad() && community && !fromNotifications) {
      return;
    }
    const fetchCommunity = !community;
    (async function () {
      try {
        const res = await mfetch(`/api/posts/${id}?fetchCommunity=${fetchCommunity}`);
        const rpost = await res.json();
        if (res.ok) {
          dispatch(postAdded(rpost));
          setPostLoading('loaded');
          dispatch(commentsAdded(id, rpost.comments, rpost.commentsNext));
          setCommentsLoading('loaded');
          if (fetchCommunity) dispatch(communityAdded(rpost.community));
          setCommunityLoading('loaded');
        } else {
          setPostLoading(res.status === 404 ? 'notfound' : 'failed');
        }
      } catch (error) {
        dispatch(snackAlertError(error));
        setPostLoading('failed');
      }
    })();
    return () => {
      dispatch({ type: 'post/cleared' });
    };
  }, [id, location]);

  useEffect(() => {
    if (community && post) {
      const seps = location.pathname.split('/');
      if (seps.length > 0 && seps[1] !== community.name) {
        seps[1] = community.name;
        let newPathname = '';
        seps.forEach((sep) => (newPathname += `${sep}/`));
        newPathname = newPathname.substring(0, newPathname.length - 1);
        history.replace(`${newPathname}${location.search}${location.hash}`);
      }
    }
  }, [location, community, post]);

  const handleAddCommentSuccess = (comment) => {
    dispatch(newCommentAdded(post.publicId, comment));
  };

  const [deleteAs, setDeleteAs] = useState('normal');
  const [deleteModalOpen, _setDeleteModalOpen] = useState(false);
  const [canDeletePostContent, setCanDeletePostContent] = useState(false);
  const setDeleteModalOpen = (open, deleteAs = 'normal') => {
    setCanDeletePostContent(Boolean(deleteAs === 'admins' || deleteAs == 'normal'));
    if (open) {
      setDeleteAs(deleteAs);
    } else {
      setDeleteAs('normal');
    }
    _setDeleteModalOpen(open);
  };
  const handleDelete = async (deleteContent = false) => {
    try {
      await mfetchjson(
        `/api/posts/${post.publicId}?deleteAs=${deleteAs}&deleteContent=${deleteContent}`,
        { method: 'DELETE' }
      );
      setDeleteModalOpen(false);
      window.location.reload();
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [deleteContentModalOpen, _setDeleteContentModalOpen] = useState(false);
  const setDeleteContentModalOpen = (open, deleteAs = 'normal') => {
    if (open) {
      setDeleteAs(deleteAs);
    } else {
      setDeleteAs('normal');
    }
    _setDeleteContentModalOpen(open);
  };
  const handleContentDelete = () => handleDelete(true);

  const handleLock = async (userGroup = 'mods') => {
    const params = new URLSearchParams();
    params.set('action', isLocked ? 'unlock' : 'lock');
    params.set('lockAs', userGroup);
    try {
      const rpost = await mfetchjson(`/api/posts/${post.publicId}?${params.toString()}`, {
        method: 'PUT',
      });
      dispatch(postAdded(rpost));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [userGroup, setUserGroup] = useState(post ? post.userGroup : null);
  useEffect(() => {
    if (post) setUserGroup(post.userGroup);
  }, [post]);
  useEffect(() => {
    if (userGroup === null || post.userGroup === userGroup) return;
    (async () => {
      try {
        const rpost = await mfetchjson(
          `/api/posts/${post.publicId}?action=changeAsUser&userGroup=${userGroup}`,
          {
            method: 'PUT',
          }
        );
        setUserGroup(rpost.userGroup);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, [userGroup]);

  const [isPinned, setIsPinned] = useState(post ? post.isPinned : false);
  useEffect(() => {
    if (post) setIsPinned(post.isPinned);
  }, [post]);

  const [isPinnedSite, setIsPinnedSite] = useState(post ? post.isPinnedSite : false);
  useEffect(() => {
    if (post) setIsPinnedSite(post.isPinnedSite);
  }, [post]);
  const handlePinChange = (e, siteWide) => {
    const checkedBefore = siteWide ? isPinnedSite : isPinned;
    const set = (checked) => {
      if (siteWide) {
        setIsPinnedSite(checked);
      } else {
        setIsPinned(checked);
      }
    };
    const checked = e.target.checked;
    set(checked);
    (async () => {
      try {
        const res = await mfetch(
          `/api/posts/${post.publicId}?action=${checked ? 'pin' : 'unpin'}&siteWide=${
            siteWide ? 'true' : 'false'
          }`,
          { method: 'PUT' }
        );
        if (!res.ok) {
          let handledError = false;
          if (res.status === 400) {
            const error = await res.json();
            if (error.code === 'max_pinned_count_reached') {
              dispatch(snackAlert('Max pinned posts count reached.'));
              set(checkedBefore);
              handledError = true;
            }
          }
          if (!handledError) {
            throw new Error(await res.text());
          }
        }
      } catch (error) {
        set(checkedBefore);
        dispatch(snackAlertError(error));
      }
    })();
  };

  const handleAnnounce = async () => {
    if (!confirm('Are you sure? This will send a notification to all users.')) {
      return;
    }
    try {
      const res = await mfetch(`/api/posts/${post.publicId}?action=announce`, { method: 'PUT' });
      if (!res.ok) {
        if (res.status === 409) {
          dispatch(snackAlert('Already announced'));
        } else {
          throw new Error(await res.text());
        }
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const isMobile = useIsMobile();
  const loggedIn = user !== null;
  const isAdmin = loggedIn && user.isAdmin;
  const bannedFrom = useSelector((state) => state.main.bannedFrom);

  if (postLoading !== 'loaded' || !post) {
    return <PageNotLoaded loading={postLoading} />;
  }

  const isLocked = post.locked;
  const hasImage = false;
  const isMod = community ? community.userMod : false;
  const isBanned =
    loggedIn && post !== null && bannedFrom.find((id) => id === post.communityId) !== undefined;
  const postOwner = user && user.id === post.userId;
  const votesCount = post.upvotes + post.downvotes;
  const upvotedPercent = votesCount > 0 ? Math.ceil((post.upvotes / votesCount) * 100) : 0;
  const showLink = !post.deletedContent && post.type === 'link';

  const disableEmbeds = user && user.embedsOff;
  const { isEmbed: _isEmbed, render: Embed, url: embedURL } = getEmbedComponent(post.link);
  const isEmbed = !disableEmbeds && _isEmbed;

  const showImage = !post.deletedContent && post.type === 'image' && post.image;

  const canVote = !post.locked;
  const canComment = !(post.locked || isBanned);

  const getDeletedBannerText = (post) => {
    if (post.deletedContent) {
      if (post.deletedAs === post.deletedContentAs) {
        return `This post and its ${
          post.type === 'image' ? 'image(s)' : post.type
        } have been removed by ${userGroupSingular(post.deletedAs, true)}.`;
      } else {
        return `This post has been removed by ${userGroupSingular(post.deletedAs, true)} and its ${
          post.type
        } has been removed
        by ${userGroupSingular(post.deletedContentAs, true)}.`;
      }
    }
    return `This post has been removed by ${userGroupSingular(post.deletedAs, true)}.`;
  };

  const deletePostContentButtonText = `Delete ${
    post.type === 'image' ? (post.images.length > 1 ? 'images' : 'image') : post.type
  }`;

  return (
    <div className="page-content page-post wrap">
      <Helmet>
        <title>{post.title}</title>
        {commentId && <meta name="robots" content="noindex" />}
      </Helmet>
      <Sidebar />
      <main className="left">
        <div className="post post-card">
          <PostVotes post={post} sticky disabled={!canVote} />
          <PostDeleteModal
            postType={post.type}
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onDelete={handleDelete}
            canDeleteContent={canDeletePostContent}
          />
          <PostContentDeleteModal
            post={post}
            open={deleteContentModalOpen}
            onClose={() => setDeleteContentModalOpen(false)}
            onDelete={handleContentDelete}
          />
          <article className="card post-card-card">
            <div className="post-card-heading">
              <PostCardHeadingDetails
                post={post}
                userGroup={userGroup}
                showEdited
                showAuthorProPic={user ? !user.hideUserProfilePictures : true}
              />
            </div>
            <div className="post-card-body">
              <header className="post-card-title">
                <LinkOrDiv
                  className={'post-card-title-text' + (showLink ? ' is-link' : '')}
                  isLink={showLink}
                  href={showLink ? post.link.url : ''}
                  target="_blank"
                  rel="noreferrer nofollow"
                >
                  <h1 className="post-card-title-main">{post.title}</h1>
                  {showLink && (
                    <div className="post-card-link-domain">
                      <span>{omitWWWFromHostname(post.link.hostname)}</span>
                      <svg
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16px"
                        height="16px"
                      >
                        <path d="M 9 2 L 9 3 L 12.292969 3 L 6.023438 9.273438 L 6.726563 9.976563 L 13 3.707031 L 13 7 L 14 7 L 14 2 Z M 4 4 C 2.894531 4 2 4.894531 2 6 L 2 12 C 2 13.105469 2.894531 14 4 14 L 10 14 C 11.105469 14 12 13.105469 12 12 L 12 7 L 11 8 L 11 12 C 11 12.550781 10.550781 13 10 13 L 4 13 C 3.449219 13 3 12.550781 3 12 L 3 6 C 3 5.449219 3.449219 5 4 5 L 8 5 L 9 4 Z" />
                      </svg>
                    </div>
                  )}
                </LinkOrDiv>
                {showLink && !isEmbed && post.link.image && (
                  <ExternalLink className="post-card-link-image" href={post.link.url}>
                    <LinkImage image={post.link.image} />
                    <SVGExternalLink />
                  </ExternalLink>
                )}
              </header>
              {post.type === 'text' && (
                <div className="post-card-text">
                  <MarkdownBody>{post.body}</MarkdownBody>
                </div>
              )}
              {/*import.meta.env.MODE !== 'production' && (
                <img
                  src="https://source.unsplash.com/featured?people,nature"
                  alt=""
                  className="post-image"
                />
              )*/}
              {showImage && post.images.length === 1 && <PostImage post={post} />}
              {showImage && post.images.length > 1 && (
                <PostImageGallery post={post} isMobile={isMobile} keyboardControlsOn />
              )}
              {isEmbed && <Embed url={embedURL} />}
              {(isLocked || post.deleted) && (
                <div className="post-card-banners">
                  {isLocked && (
                    <div
                      className="post-card-banner is-locked"
                      style={{ color: 'var(--color-red)' }}
                    >
                      This post has been locked by {userGroupSingular(post.lockedByGroup)}.
                    </div>
                  )}
                  {post.deleted && (
                    <div
                      className="post-card-banner is-deleted"
                      style={{ color: 'var(--color-red)' }}
                    >
                      {getDeletedBannerText(post)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="post-card-bottom is-t">
              <div className="left">
                <PostVotes post={post} mobile disabled={!canVote} />
              </div>
              <div className="right">
                {votesCount > 0 && (
                  <div className="post-card-vote-percent">{upvotedPercent}% Upvoted</div>
                )}
              </div>
            </div>
            <div className={'post-card-bottom' + (!hasImage ? ' has-no-img' : '')}>
              <div className="left">
                <PostShareButton post={post} />
                {loggedIn && (
                  <button
                    className="button-text"
                    onClick={() => dispatch(saveToListModalOpened(post.id, 'post'))}
                  >
                    Save
                  </button>
                )}
                {postOwner && (
                  <button
                    className="button-text"
                    onClick={() =>
                      history.push(`/new?edit=${post.publicId}`, { fromPostPage: true })
                    }
                  >
                    Edit
                  </button>
                )}
                {postOwner && !post.deleted && (
                  <button className="button-red" onClick={() => setDeleteModalOpen(true)}>
                    Delete
                  </button>
                )}
                {postOwner && post.deleted && !post.deletedContent && post.type !== 'text' && (
                  <button className="button-red" onClick={() => setDeleteContentModalOpen(true)}>
                    {deletePostContentButtonText}
                  </button>
                )}
                {/*loggedIn && isMod && (
                  <>
                    <button className="button-red" onClick={handleLock}>
                      {isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </>
                )*/}
                {loggedIn && isMod && (
                  <Dropdown target={<button className="button-red">Mod actions</button>}>
                    <div className="dropdown-list">
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => handleLock('mods')}
                      >
                        {isLocked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => setDeleteModalOpen(true, 'mods')}
                        disabled={post.deleted}
                      >
                        Delete
                      </button>
                      <div className="dropdown-item is-non-reactive">
                        <div className="checkbox">
                          <input
                            id={'ch-user-group-m'}
                            type="checkbox"
                            checked={userGroup === 'mods' ? true : false}
                            onChange={(e) => setUserGroup(e.target.checked ? 'mods' : 'normal')}
                            disabled={!postOwner}
                          />
                          <label htmlFor={'ch-user-group-m'}>Speaking officially</label>
                        </div>
                      </div>
                      <div className="dropdown-item is-non-reactive">
                        <div className="checkbox">
                          <input
                            id={'ch-pin-m'}
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => handlePinChange(e, false)}
                            disabled={post.deleted && !isPinned}
                          />
                          <label htmlFor={'ch-pin-m'}>Pinned</label>
                        </div>
                      </div>
                    </div>
                  </Dropdown>
                )}
                {isAdmin && (
                  <Dropdown target={<button className="button-red">Admin actions</button>}>
                    <div className="dropdown-list">
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => alert(`ID: ${post.id}`)}
                      >
                        ID
                      </button>
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => handleLock('admins')}
                      >
                        {isLocked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => setDeleteModalOpen(true, 'admins')}
                        disabled={post.deleted}
                      >
                        Delete
                      </button>
                      <button
                        className="button-clear dropdown-item"
                        onClick={() => setDeleteContentModalOpen(true, 'admins')}
                        disabled={!post.deleted || post.deletedContent}
                      >
                        {deletePostContentButtonText}
                      </button>
                      <div className="dropdown-item is-non-reactive">
                        <div className="checkbox">
                          <input
                            id={'ch-user-group-a'}
                            type="checkbox"
                            checked={userGroup === 'admins' ? true : false}
                            onChange={(e) => setUserGroup(e.target.checked ? 'admins' : 'normal')}
                            disabled={!postOwner}
                          />
                          <label htmlFor={'ch-user-group-a'}>Speaking officially</label>
                        </div>
                      </div>
                      <div className="dropdown-item is-non-reactive">
                        <div className="checkbox">
                          <input
                            id={'ch-pin-a'}
                            type="checkbox"
                            checked={isPinnedSite}
                            onChange={(e) => handlePinChange(e, true)}
                            disabled={post.deleted && !isPinnedSite}
                          />
                          <label htmlFor={'ch-pin-a'}>Pinned</label>
                        </div>
                      </div>
                      <button className="button-clear dropdown-item" onClick={handleAnnounce}>
                        Announce
                      </button>
                    </div>
                  </Dropdown>
                )}
                {loggedIn && !postOwner && (
                  <ReportModal target={post} targetType="post" disabled={isBanned} />
                )}
              </div>
              <div className="right">
                <PostVotesBar up={post.upvotes} down={post.downvotes} />
              </div>
            </div>
            <div className="post-comments">
              <div className="post-comments-title">
                <div className="post-comments-count">
                  {stringCount(post.noComments, false, 'comment')}
                </div>
              </div>
              {/* <CommentsSortButton /> */}
              <AddComment
                isMod={isMod}
                post={post}
                onSuccess={handleAddCommentSuccess}
                main
                loggedIn={loggedIn}
                disabled={!canComment}
              />
              {commentsLoading === 'loaded' && post && community ? (
                <>
                  <CommentSection
                    post={post}
                    community={community}
                    user={user}
                    focusId={commentId}
                    isMobile={isMobile}
                    isAdmin={isAdmin}
                    isBanned={isBanned}
                    canVote={canVote}
                    canComment={canComment}
                  />
                  {post.noComments === 0 && (
                    <div className="post-comments-none is-no-m">No comments yet.</div>
                  )}
                </>
              ) : (
                <div className="post-comments-loading flex flex-center">
                  <Spinner />
                </div>
              )}
            </div>
          </article>
        </div>
      </main>
      <aside className="right">
        <div className="post-right-content is-sticky">
          {communityLoading === 'loaded' && community ? (
            <CommunityCard community={community} />
          ) : (
            <CommunitySkeleton />
          )}
          <MiniFooter />
        </div>
      </aside>
    </div>
  );
};

export default Post;

const CommunitySkeleton = () => (
  <div className="skeleton community-skeleton">
    <div className="ck-head">
      <div className="skeleton-circle"></div>
      <div className="flex-column">
        <div
          className="skeleton-bar"
          style={{ height: '1.8rem', width: '80%', marginBottom: '1rem' }}
        ></div>
        <div className="skeleton-bar" style={{ height: '1.5rem', width: '50%' }}></div>
      </div>
    </div>
    <div className="ck-content">
      <div className="skeleton-bar is-small"></div>
      <div className="skeleton-bar is-small"></div>
      <div className="skeleton-bar is-small" style={{ width: '50%' }}></div>
      <div className="skeleton-bar is-button"></div>
    </div>
  </div>
);
