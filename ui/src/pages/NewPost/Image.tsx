import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ButtonClose } from '../../components/Button';
import Img from '../../components/Image';
import Textarea from '../../components/Textarea';
import { useWindowWidth } from '../../hooks';
import { Image as ServerImage } from '../../serverTypes';

export interface ImageProps {
  image: ServerImage;
  onClose: () => void;
  disabled?: boolean;
  requiresAltText: boolean;
  onAltTextSave: (altText: string) => void;
}

const Image = ({
  image,
  onClose,
  disabled = false,
  requiresAltText,
  onAltTextSave,
}: ImageProps) => {
  const { width, height } = image;
  const windowWidth = useWindowWidth();

  const divref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.0);
  useLayoutEffect(() => {
    if (divref.current) {
      const containerWidth = divref.current.parentElement?.clientWidth;
      if (containerWidth) {
        setScale(containerWidth / width);
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

  return (
    <div className="page-new-image" ref={divref}>
      {!disabled && (
        <ButtonClose
          className="button-close"
          onClick={() => onClose()}
          style={{ padding: '6px' }}
        />
      )}
      <div className="contain-image">
        <Img
          src={image.url}
          backgroundColor={image.averageColor}
          alt={image.altText || 'Just uploaded'}
          style={{
            width: imgWidth,
            height: imgHeight,
          }}
        />
      </div>
      {/* alt text input */}
      {!disabled && (
        <Textarea
          className={clsx('page-new-image-alt', missingAltText && 'is-error')}
          placeholder={'Describe this image (alt text)…'}
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={() => {
            if (altText !== image.altText) {
              onAltTextSave(altText);
            }
          }}
          maxLength={1024}
          style={{ marginTop: 8, width: '100%', resize: 'vertical' }}
        />
      )}
    </div>
  );
};

export default Image;
