import PropTypes from 'prop-types';
import { useState } from 'react';
import { ButtonClose } from '../../components/Button';
import Modal from '../../components/Modal';
import { Post } from '../../serverTypes';

export interface PostDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onDelete: (deleteContent: boolean) => void;
  postType: Post['type'];
  canDeleteContent?: boolean;
}

const PostDeleteModal = ({
  open,
  onClose,
  onDelete,
  postType,
  canDeleteContent = false,
}: PostDeleteModalProps) => {
  const [deleteContent, setDeleteContent] = useState(false);

  const showCheckbox = canDeleteContent && (postType === 'image' || postType === 'link');
  let label = 'Delete ';
  if (postType === 'image') label += 'image too.';
  else if (postType === 'link') label += 'link too.';

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card is-compact-mobile is-center modal-delete-post">
        <div className="modal-card-head">
          <div className="modal-card-title">Delete post</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">
          <p>Are you sure you want to delete this post?</p>
          {showCheckbox && (
            <div className="checkbox" style={{ marginTop: '5px' }}>
              <input
                id="post_del_content"
                type="checkbox"
                checked={deleteContent}
                onChange={(e) => setDeleteContent(e.target.checked)}
              />
              <label htmlFor="post_del_content">{label}</label>
            </div>
          )}
        </div>
        <div className="modal-card-actions">
          <button className="button-main" onClick={() => onDelete(deleteContent)}>
            Yes
          </button>
          <button onClick={onClose}>No</button>
        </div>
      </div>
    </Modal>
  );
};

export interface PostContentDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  post: Post;
}

export const PostContentDeleteModal = ({
  open,
  onClose,
  onDelete,
  post,
}: PostContentDeleteModalProps) => {
  const postContentType =
    post.type === 'image'
      ? post.images && post.images.length > 1
        ? 'images'
        : 'image'
      : post.type;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card">
        <div className="modal-card-head">
          <div className="modal-card-title">Delete post {postContentType}</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">
          <p>{`Are you sure you want to permanently delete the post's ${postContentType}?`}</p>
        </div>
        <div className="modal-card-actions">
          <button className="button-main" onClick={() => onDelete()}>
            Yes
          </button>
          <button onClick={onClose}>No</button>
        </div>
      </div>
    </Modal>
  );
};

PostContentDeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
};

export default PostDeleteModal;
