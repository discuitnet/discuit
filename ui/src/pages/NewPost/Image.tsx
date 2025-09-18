import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Button, { ButtonClose } from '../../components/Button';
import Img from '../../components/Image';
import Modal from '../../components/Modal';
import Textarea from '../../components/Textarea';
import { useIsMobile, useWindowWidth } from '../../hooks';
import { Image as ServerImage } from '../../serverTypes';

export interface ImageProps {
  image: ServerImage;
  onClose: () => void;
  disabled?: boolean;
  requiresAltText: boolean;
  onAltTextSave: (altText: string) => void;
  isEditMode?: boolean;
}

const Image = ({
  image,
  onClose,
  disabled = false,
  requiresAltText,
  onAltTextSave,
  isEditMode = false,
}: ImageProps) => {
  const { width, height } = image;
  const windowWidth = useWindowWidth();

  const divref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.0);
  const [gridImgWidth, setGridImgWidth] = useState(0);
  useLayoutEffect(() => {
    if (divref.current) {
      const containerWidth = divref.current.parentElement?.clientWidth;
      if (containerWidth) {
        setScale(containerWidth / width);
        const gridGap = 8;
        setGridImgWidth((containerWidth - gridGap) / 2);
      }
    }
  }, [image, windowWidth, width]);

  const imgWidth = Math.floor(scale * width),
    imgHeight = Math.floor(scale * height);

  const [altText, setAltText] = useState(image.altText || '');
  const missingAltText = requiresAltText ? altText.trim().length <= 0 : false;

  useEffect(() => {
    setAltText(image.altText || '');
  }, [image.altText]);

  const [modalOpen, setModalOpen] = useState(false);
  const handleModalClose = () => setModalOpen(false);
  const handleModalCancel = () => {
    setAltText(image.altText || '');
    handleModalClose();
  };
  const handleAltTextSave = () => {
    if (altText !== image.altText) {
      onAltTextSave(altText);
    }
    handleModalClose();
  };

  const isMobile = useIsMobile();

  return (
    <div className="page-new-image" ref={divref}>
      {!disabled && (
        <ButtonClose
          className="button-close"
          onClick={() => onClose()}
          style={{ padding: '6px' }}
        />
      )}
      {(!disabled || isEditMode) && (
        <Button className="button-alt-text" onClick={() => setModalOpen(true)}>
          Alt text
        </Button>
      )}
      <div className="contain-image">
        <Img
          src={image.url}
          backgroundColor={image.averageColor}
          alt={image.altText || 'Just uploaded'}
          style={{
            width: isMobile ? '100%' : gridImgWidth,
            height: isMobile ? 'max-content' : gridImgWidth,
            objectFit: 'cover',
          }}
        />
      </div>
      <Modal open={modalOpen} onClose={handleModalClose} noOuterClickClose>
        <div className="modal-card modal-add-alt-text">
          <div className="modal-card-head">
            <div className="modal-card-title">Add alt text</div>
            <ButtonClose onClick={handleModalClose} />
          </div>
          <div className="modal-card-content">
            <Img
              src={image.url}
              backgroundColor={image.averageColor}
              alt={image.altText || 'Just uploaded'}
              style={{
                width: isMobile ? '100%' : imgWidth,
                height: isMobile ? 'auto' : imgHeight,
              }}
            />
            <Textarea
              className={clsx('page-new-image-alt', missingAltText && 'is-error')}
              placeholder={'Describe this image (alt text)…'}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              maxLength={1024}
            />
          </div>
          <div className="modal-card-actions">
            <button className="button-main" onClick={handleAltTextSave}>
              Save
            </button>
            <button onClick={handleModalCancel}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Image;
