import PropTypes from 'prop-types';
import React from 'react';
import { useDispatch } from 'react-redux';
import Dropdown from '../../components/Dropdown';
import { copyToClipboard, publicURL } from '../../helper';
import { snackAlert } from '../../slices/mainSlice';

export const CommentShareDropdownItems = ({ prefix = '', url }) => {
  const dispatch = useDispatch();
  const handleCopyURL = () => {
    let text = 'Failed to copy link to clipboard.';
    if (copyToClipboard(publicURL(url))) {
      text = 'Link copied to clipboard.';
    }
    dispatch(snackAlert(text, 'comment_link_copied'));
  };

  const to = prefix !== '' ? prefix : 'To ';

  return (
    <>
      {/* <div className="dropdown-item">{to}Facebook</div>
      <div className="dropdown-item">{to}Twitter</div> */}
      <div className="dropdown-item" onClick={handleCopyURL}>
        Copy URL
      </div>
    </>
  );
};

CommentShareDropdownItems.propTypes = {
  prefix: PropTypes.string,
  url: PropTypes.string.isRequired,
};

const CommentShareButton = ({ url }) => {
  return (
    <Dropdown target={<button className="button-text post-comment-button">Share</button>}>
      <div className="dropdown-list">
        <CommentShareDropdownItems url={url} />
      </div>
    </Dropdown>
  );
};

CommentShareButton.propTypes = {
  url: PropTypes.string.isRequired,
};

export default CommentShareButton;
