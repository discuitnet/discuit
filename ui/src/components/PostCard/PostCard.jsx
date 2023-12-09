/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Link from '../Link';
import { omitWWWFromHostname, stringCount } from '../../helper';
import MarkdownBody from '../MarkdownBody';
import ShowMoreBox from '../ShowMoreBox';
import PostVotes from './PostVotes';
import PostCardHeadingDetails from './PostCardHeadingDetails';
import Image from './Image';
import LinkImage from './LinkImage';
import { useIsMobile } from '../../hooks';
import getEmbedComponent from './embed';

const PostCard = ({
  index = 100, // index in feed
  initialPost,
  hideVoting = false,
  openInTab = false,
  compact = false,
  inModTools = false,
  disableEmbeds = false,
}) => {
  const history = useHistory();

  const [post, setPost] = useState(initialPost);
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const postURL = `/${post.communityName}/post/${post.publicId}`;
  const target = openInTab ? '_blank' : '_self';
  const disabled = inModTools || post.locked;

  const handlePostCardClick = (e, target = '_blank') => {
    let isButtonClick = false;
    let el = e.target;
    while (el && !el.classList.contains('post-card-card')) {
      if (el.nodeName === 'BUTTON' || el.nodeName === 'A') {
        isButtonClick = true;
        break;
      }
      el = el.parentElement;
      if (!el.parentElement) isButtonClick = true; // Clicked somewhere outside .post-card-card.
    }
    if (!isButtonClick) {
      if (target !== '_self') {
        window.open(postURL);
      } else {
        history.push(postURL);
      }
    }
  };

  const handleAuxClick = (e) => {
    // mouse middle button
    if (e.button === 1) {
      handlePostCardClick(e, '_blank');
    }
  };

  const [isDomainHovering, setIsDomainHovering] = useState(false);

  const isMobile = useIsMobile();
  const isPinned = post.isPinned || post.isPinnedSite;
  const showLink = !post.deletedContent && post.type === 'link';

  const { isEmbed: _isEmbed, render: Embed, url: embedURL } = getEmbedComponent(post.link);
  const isEmbed = !disableEmbeds && _isEmbed;

  const showImage = !post.deletedContent && post.type === 'image';
  const imageLoadingStyle = index < 3 ? 'eager' : 'lazy';

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
          <PostCardHeadingDetails post={post} target={target} />
        </div>
        <div className={'post-card-body' + (isDomainHovering ? ' is-domain-hover' : '')}>
          <div className="post-card-title">
            <div className="post-card-title-text">
              <Link className="post-card-title-main" to={postURL} target={target}>
                {post.title}
              </Link>
              {showLink && (
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
            {showLink && !isEmbed && post.link.image && (
              <Link className="post-card-link-image" to={postURL} target={target}>
                <LinkImage link={post.link} loading={imageLoadingStyle} />
              </Link>
            )}
          </div>
          {isEmbed && <Embed url={embedURL} />}
          {post.type === 'text' && (
            <div className="post-card-text">
              <ShowMoreBox maxHeight="200px">
                <MarkdownBody noLinks>{post.body}</MarkdownBody>
              </ShowMoreBox>
            </div>
          )}
          {showImage && (
            <Image
              post={post}
              to={postURL}
              target={target}
              isMobile={isMobile}
              loading={imageLoadingStyle}
            />
          )}
        </div>
        <div className="post-card-bottom">
          <div className="left">
            <Link to={postURL} className="button button-text button-with-icon" target={target}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22.81C11.31 22.81 10.66 22.46 10.2 21.85L8.7 19.85C8.67 19.81 8.55 19.76 8.5 19.75H8C3.83 19.75 1.25 18.62 1.25 13V8C1.25 3.58 3.58 1.25 8 1.25H16C20.42 1.25 22.75 3.58 22.75 8V13C22.75 17.42 20.42 19.75 16 19.75H15.5C15.42 19.75 15.35 19.79 15.3 19.85L13.8 21.85C13.34 22.46 12.69 22.81 12 22.81ZM8 2.75C4.42 2.75 2.75 4.42 2.75 8V13C2.75 17.52 4.3 18.25 8 18.25H8.5C9.01 18.25 9.59 18.54 9.9 18.95L11.4 20.95C11.75 21.41 12.25 21.41 12.6 20.95L14.1 18.95C14.43 18.51 14.95 18.25 15.5 18.25H16C19.58 18.25 21.25 16.58 21.25 13V8C21.25 4.42 19.58 2.75 16 2.75H8Z"
                  fill="currentColor"
                />
                <path
                  d="M17 8.75H7C6.59 8.75 6.25 8.41 6.25 8C6.25 7.59 6.59 7.25 7 7.25H17C17.41 7.25 17.75 7.59 17.75 8C17.75 8.41 17.41 8.75 17 8.75Z"
                  fill="currentColor"
                />
                <path
                  d="M13 13.75H7C6.59 13.75 6.25 13.41 6.25 13C6.25 12.59 6.59 12.25 7 12.25H13C13.41 12.25 13.75 12.59 13.75 13C13.75 13.41 13.41 13.75 13 13.75Z"
                  fill="currentColor"
                />
              </svg>
              <span>{stringCount(post.noComments, false, 'comment')}</span>
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

PostCard.propTypes = {
  index: PropTypes.number,
  initialPost: PropTypes.object,
  hideVoting: PropTypes.bool,
  openInTab: PropTypes.bool,
  compact: PropTypes.bool,
  inModTools: PropTypes.bool,
};

export default PostCard;

export const MemorizedPostCard = React.memo(PostCard);
