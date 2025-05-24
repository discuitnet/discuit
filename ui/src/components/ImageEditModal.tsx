import { useEffect, useRef, useState } from 'react';
import { ButtonClose } from './Button';
import Modal from './Modal';

export interface ImageEditModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  imageUrl?: string;
  altText?: string;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onSave: (altText: string) => void;
  uploading?: boolean;
  deleting?: boolean;
  canDelete?: boolean;
  isCircular?: boolean;
}

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
}: ImageEditModalProps) => {
  const [altText, setAltText] = useState(initialAltText || '');
  // const [_file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setAltText(initialAltText || '');
    // setFile(null);
  }, [open, initialAltText]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      // setFile(event.target.files[0]);
      onUpload(event.target.files[0]);
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
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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

export default ImageEditModal;
