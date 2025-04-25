import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { ButtonClose } from './Button';

const ImageEditModal = ({
  open,
  onClose,
  title,
  imageUrl,
  altText: initialAltText,
  onUpload,
  onDelete,
  onSave,
  uploading,
  deleting,
  canDelete = true,
  isCircular = true,
}) => {
  const [altText, setAltText] = useState(initialAltText || '');
  const [_file, setFile] = useState(null);

  useEffect(() => {
    setAltText(initialAltText || '');
    setFile(null);
  }, [open, initialAltText]);

  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      onUpload(e.target.files[0]);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete the current image?')) {
      onDelete();
    }
  };

  const handleSave = () => {
    onSave(altText);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card image-edit-modal">
        <div className="modal-card-head">
          <div className="modal-card-title">{title}</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">
          <div className={`image-edit-preview ${isCircular ? 'image-edit-preview-circular' : ''}`}>
            {imageUrl ? (
              <img src={imageUrl} alt={altText} className="image-edit-placeholder" />
            ) : (
              <div className="image-edit-placeholder">No image</div>
            )}
          </div>
          <div className="image-edit-actions">
            <button onClick={() => fileInputRef.current.click()} disabled={uploading}>
              {uploading ? <>Uploading...</> : 'Upload new'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting || !imageUrl}>
                {deleting ? <>Deleting...</> : 'Delete current'}
              </button>
            )}
          </div>
          <div className="image-edit-alt-label">Alt text</div>
          <textarea
            className="image-edit-alt-input"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            maxLength={1024}
            placeholder="Describe this image..."
          />
        </div>
        <div className="modal-card-actions">
          <button onClick={onClose}>Close</button>
          <button className="button-main" onClick={handleSave} disabled={!imageUrl}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

ImageEditModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  imageUrl: PropTypes.string,
  altText: PropTypes.string,
  onUpload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  uploading: PropTypes.bool,
  deleting: PropTypes.bool,
  canDelete: PropTypes.bool,
  isCircular: PropTypes.bool,
};

export default ImageEditModal;
