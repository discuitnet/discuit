import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { copyToClipboard } from '../../helper';
import { snackAlert } from '../../slices/mainSlice';
import Dropdown from '../../components/Dropdown';

const Target = ({ ...props }) => {
  return (
    <div className="button button-with-icon button-text" {...props}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.40995 21.7499C4.28995 21.7499 3.57995 21.3699 3.12995 20.9199C2.24995 20.0399 1.62995 18.1699 3.60995 14.1999L4.47995 12.4699C4.58995 12.2399 4.58995 11.7599 4.47995 11.5299L3.60995 9.7999C1.61995 5.8299 2.24995 3.9499 3.12995 3.0799C3.99995 2.1999 5.87995 1.5699 9.83995 3.5599L18.3999 7.8399C20.5299 8.8999 21.6999 10.3799 21.6999 11.9999C21.6999 13.6199 20.5299 15.0999 18.4099 16.1599L9.84995 20.4399C7.90995 21.4099 6.46995 21.7499 5.40995 21.7499ZM5.40995 3.7499C4.86995 3.7499 4.44995 3.8799 4.18995 4.1399C3.45995 4.8599 3.74995 6.7299 4.94995 9.1199L5.81995 10.8599C6.13995 11.5099 6.13995 12.4899 5.81995 13.1399L4.94995 14.8699C3.74995 17.2699 3.45995 19.1299 4.18995 19.8499C4.90995 20.5799 6.77995 20.2899 9.17995 19.0899L17.7399 14.8099C19.3099 14.0299 20.1999 12.9999 20.1999 11.9899C20.1999 10.9799 19.2999 9.9499 17.7299 9.1699L9.16995 4.8999C7.64995 4.1399 6.33995 3.7499 5.40995 3.7499Z"
          fill="currentColor"
        />
        <path
          d="M10.8395 12.75H5.43945C5.02945 12.75 4.68945 12.41 4.68945 12C4.68945 11.59 5.02945 11.25 5.43945 11.25H10.8395C11.2495 11.25 11.5895 11.59 11.5895 12C11.5895 12.41 11.2495 12.75 10.8395 12.75Z"
          fill="currentColor"
        />
      </svg>
      <span>Share</span>
    </div>
  );
};

const PostShareButton = ({ post, imageGalleryCurrentIndex = 0 }) => {
  const dispatch = useDispatch();

  const url = `${window.location.origin}/${post.communityName}/post/${post.publicId}`;
  const handleCopyURL = () => {
    let text = 'Failed to copy link to clipboard.';
    if (copyToClipboard(url)) {
      text = 'Link copied to clipboard.';
    }
    dispatch(snackAlert(text, 'pl_copied'));
  };

  const hasMoreShareableOptions = window.innerWidth < 1171 && Boolean(navigator.share);
  const handleMoreButtonClick = async () => {
    try {
      await navigator.share({
        title: post.title,
        url,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const renderImageDownloadButton = () => {
    if (post.images.length === 0) {
      return (
        <div className="button-clear dropdown-item" style={{ opacity: 'var(--disabled-opacity)' }}>
          Download image
        </div>
      );
    }

    const image = post.images[imageGalleryCurrentIndex];
    const url = image.url;
    const filename = `discuit-${post.communityName}[${post.publicId}]-${
      imageGalleryCurrentIndex + 1
    }.${image.format}`;
    return (
      <a href={url} className="button-clear dropdown-item" download={filename}>
        Download image
      </a>
    );
  };

  const twitterText = `"${post.title}" ${url}`;

  return (
    <Dropdown target={<Target />}>
      <div className="dropdown-list">
        <a
          className="button-clear dropdown-item"
          target="_blank"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`}
          rel="noreferrer"
        >
          To Twitter / X
        </a>
        <a
          className="button-clear dropdown-item"
          target="_blank"
          href={`https://www.facebook.com/sharer.php?u=${url}`}
          rel="noreferrer"
        >
          To Facebook
        </a>
        <button className="button-clear dropdown-item" onClick={handleCopyURL}>
          Copy URL
        </button>
        {post.type === 'image' && renderImageDownloadButton()}
        {hasMoreShareableOptions && (
          <button className="button-clear dropdown-item" onClick={handleMoreButtonClick}>
            More
          </button>
        )}
      </div>
    </Dropdown>
  );
};

PostShareButton.propTypes = {
  post: PropTypes.object.isRequired,
  imageGalleryCurrentIndex: PropTypes.number,
};

export default PostShareButton;
