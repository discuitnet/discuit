import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { mfetchjson, omitWWWFromHostname, stringCount } from '../../helper';
import { useIsMobile } from '../../hooks';
import { snackAlertError } from '../../slices/mainSlice';
import { Post, postHidden } from '../../slices/postsSlice';
import { SVGComment, SVGExternalLink } from '../../SVGs';
import Button from '../Button';
import Link from '../Link';
import MarkdownBody from '../MarkdownBody';
import PostImageGallery from '../PostImageGallery';
import ShowMoreBox from '../ShowMoreBox';
import embeddedElement from './embed';
import LinkImage from './LinkImage';
import PostCardHeadingDetails from './PostCardHeadingDetails';
import PostCardImage from './PostCardImage';
import PostVotes from './PostVotes';

export interface PostCardProps {
  index?: number; // Index in the feed.
  initialPost: Post;
  hideVoting?: boolean;
  openInTab?: boolean;
  compact?: boolean;
  inModTools?: boolean;
  disableEmbeds?: boolean;
  onRemoveFromList?: (postId: string) => void;
  feedItemKey?: string;
  canHideFromFeed?: boolean;
}

const PostCard = ({
  index = 100,
  initialPost,
  hideVoting = false,
  openInTab = false,
  compact = true,
  inModTools = false,
  disableEmbeds = false,
  onRemoveFromList,
  feedItemKey,
  canHideFromFeed = false,
}: PostCardProps) => {
  const history = useHistory();

  const [post, setPost] = useState(initialPost);
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const postURL = `/${post.communityName}/post/${post.publicId}`;
  const target = openInTab ? '_blank' : '_self';
  const disabled = inModTools || post.locked;

  const handlePostCardClick = (event: React.MouseEvent, target = '_blank') => {
    let isButtonClick = false;
    let el = event.target as Element | null;
    while (el && !el.classList.contains('post-card-card')) {
      if (el.nodeName === 'BUTTON' || el.nodeName === 'A' || el.classList.contains('is-button')) {
        isButtonClick = true;
        break;
      }
      el = el.parentElement;
    }
    if (!isButtonClick) {
      if (target !== '_self') {
        window.open(postURL);
      } else {
        history.push(postURL);
      }
    }
  };

  const handleAuxClick = (event: React.MouseEvent) => {
    if (event.button === 1) {
      handlePostCardClick(event, '_blank');
    }
  };

  const dispatch = useDispatch();
  const handleHidePost = async () => {
    try {
      await mfetchjson('/api/hidden_posts', {
        method: 'POST',
        body: JSON.stringify({ postId: post.id }),
      });
      dispatch(postHidden(post.publicId, true, feedItemKey));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleUnHidePost = async () => {
    try {
      await mfetchjson(`/api/hidden_posts/${post.id}`, { method: 'DELETE' });
      dispatch(postHidden(post.publicId, false, feedItemKey));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [isDomainHovering, setIsDomainHovering] = useState(false);

  const isMobile = useIsMobile();
  const isPinned = post.isPinned || post.isPinnedSite;
  const showLink = !post.deletedContent && post.type === 'link';

  const { isEmbed: _isEmbed, element: embeddedReactElement } = embeddedElement(post.link);
  const isEmbed = !disableEmbeds && _isEmbed;

  const showImage = !compact && !post.deletedContent && post.type === 'image' && post.image;
  const imageLoadingStyle = index < 3 ? 'eager' : 'lazy';

  const renderThumbnail = () => {
    if (!(compact || (post.type === 'link' && !isEmbed))) {
      return null;
    }
    /*
    if (post.type === 'text') {
      return (
        <div className="post-card-link-image-text">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 7.75H3C2.59 7.75 2.25 7.41 2.25 7C2.25 6.59 2.59 6.25 3 6.25H21C21.41 6.25 21.75 6.59 21.75 7C21.75 7.41 21.41 7.75 21 7.75Z"
              fill="currentColor"
            />
            <path
              d="M21 12.75H3C2.59 12.75 2.25 12.41 2.25 12C2.25 11.59 2.59 11.25 3 11.25H21C21.41 11.25 21.75 11.59 21.75 12C21.75 12.41 21.41 12.75 21 12.75Z"
              fill="currentColor"
            />
            <path
              d="M21 17.75H3C2.59 17.75 2.25 17.41 2.25 17C2.25 16.59 2.59 16.25 3 16.25H21C21.41 16.25 21.75 16.59 21.75 17C21.75 17.41 21.41 17.75 21 17.75Z"
              fill="currentColor"
            />
          </svg>
        </div>
      );
    }
    */
    let image;
    if (post.type === 'link') {
      if (post.link && post.link.image) {
        image = post.link.image;
      }
    } else if (post.type === 'image') {
      image = post.image;
    }
    if (!image) {
      return null;
    }
    return (
      <Link className="post-card-link-image" to={postURL} target={target}>
        <LinkImage image={image} loading={imageLoadingStyle} isImagePost={post.type !== 'link'} />
        {compact && post.type === 'link' && <SVGExternalLink className="is-link-svg" />}
      </Link>
    );
  };

  if (post.hidden) {
    return (
      <div className="card post-card-hidden">
        <div>Hidden post</div> <Button onClick={handleUnHidePost}>Undo</Button>
      </div>
    );
  }

  return (
    <div
      className={
        'post-card' +
        (inModTools ? ' is-in-modtools' : '') +
        (hideVoting ? ' no-voting' : '') +
        (compact ? ' is-compact' : '') +
        (isPinned ? ' is-pinned' : '')
      }
    >
      {!hideVoting && <PostVotes post={post} disabled={disabled} />}
      <div
        className="card post-card-card"
        onClick={(e) => handlePostCardClick(e, target)}
        onAuxClick={handleAuxClick}
      >
        <div className="post-card-heading">
          <PostCardHeadingDetails
            post={post}
            onRemoveFromList={onRemoveFromList}
            compact={compact}
            onHidePost={canHideFromFeed ? handleHidePost : undefined}
          />
        </div>
        <div className={'post-card-body' + (isDomainHovering ? ' is-domain-hover' : '')}>
          <div className="post-card-title">
            <div className="post-card-title-text">
              <Link className="post-card-title-main" to={postURL} target={target}>
                {post.title}
              </Link>
              {showLink && post.link && (
                <a
                  className="post-card-link-domain"
                  href={post.link.url}
                  target="_blank"
                  rel="nofollow noreferrer"
                  onMouseEnter={() => setIsDomainHovering(true)}
                  onMouseLeave={() => setIsDomainHovering(false)}
                >
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
                </a>
              )}
            </div>
            {renderThumbnail()}
          </div>
          {!compact && isEmbed && embeddedReactElement}
          {!compact && post.type === 'text' && (
            <div className="post-card-text">
              <ShowMoreBox maxHeight="200px" childrenHash={post.body || ''}>
                <MarkdownBody noLinks>{post.body}</MarkdownBody>
              </ShowMoreBox>
            </div>
          )}
          {showImage && post.images && post.images.length === 1 && (
            <PostCardImage image={post.images[0]} isMobile={isMobile} loading={imageLoadingStyle} />
          )}
          {showImage && post.images && post.images.length > 1 && <PostImageGallery post={post} />}
        </div>
        <div className="post-card-bottom">
          <div className="left">
            <Link to={postURL} className="button button-text button-with-icon" target={target}>
              <SVGComment variant="outline" />
              <span>{stringCount(post.noComments, false, 'comment')}</span>
              {post.newComments != 0 && (
                <span className="post-new-comment-label">({post.newComments} new)</span>
              )}
            </Link>
          </div>
          <div className="right">
            {!hideVoting && <PostVotes post={post} disabled={disabled} mobile />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;

export const MemorizedPostCard = React.memo(PostCard);
