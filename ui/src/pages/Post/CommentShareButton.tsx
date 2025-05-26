import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import Dropdown from '../../components/Dropdown';
import { copyToClipboard, publicURL } from '../../helper';
import { snackAlert } from '../../slices/mainSlice';

export const CommentShareDropdownItems = ({ url }: { url: string }) => {
  const dispatch = useDispatch();
  const handleCopyURL = () => {
    let text = 'Failed to copy link to clipboard.';
    if (copyToClipboard(publicURL(url))) {
      text = 'Link copied to clipboard.';
    }
    dispatch(snackAlert(text, 'comment_link_copied'));
  };

  return (
    <div className="dropdown-item" onClick={handleCopyURL}>
      Copy URL
    </div>
  );
};

CommentShareDropdownItems.propTypes = {
  url: PropTypes.string.isRequired,
};

const CommentShareButton = ({ url }: { url: string }) => {
  return (
    <Dropdown target={<button className="button-text post-comment-button">Share</button>}>
      <div className="dropdown-list">
        <CommentShareDropdownItems url={url} />
      </div>
    </Dropdown>
  );
};

export default CommentShareButton;
