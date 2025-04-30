import PropTypes from 'prop-types';
import React, { useLayoutEffect, useRef, useEffect, useState } from 'react';
import { ButtonClose } from '../../components/Button';
import Img from '../../components/Image';
import { useWindowWidth } from '../../hooks';
import Textarea from '../../components/Textarea';

const Image = ({ image, onClose, disabled = false, onAltTextSave }) => {
  const url = image.url ?? `/images/${image.fid}/${image.id}.jpg`;
  const { width, height } = image;

  const windowWidth = useWindowWidth();

  const divref = useRef();
  const [scale, setScale] = useState(0.0);
  useLayoutEffect(() => {
    if (divref.current) {
      const containerWidth = divref.current.parentElement.clientWidth;
      setScale(containerWidth / width);
    }
  }, [image, windowWidth]);

  let imgWidth = Math.floor(scale * width),
    imgHeight = Math.floor(scale * height);

  let averageColor = image.averageColor;
  if (typeof image.averageColor === 'object') {
    const x = image.averageColor;
    averageColor = `rgb(${x.r}, ${x.g}, ${x.b})`;
  }

  const [altText, setAltText] = useState(image.altText || '');
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
          src={url}
          backgroundColor={averageColor}
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
          type="text"
          className="page-new-image-alt"
          placeholder="Describe this image (alt text)…"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={() => {
            if (altText !== image.altText) {
              onAltTextSave?.(altText);
            }
          }}
          maxLength={1024}
          style={{ marginTop: 8, width: '100%', resize: 'vertical' }}
        />
      )}
    </div>
  );
};

Image.propTypes = {
  image: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onAltTextSave: PropTypes.func,
};

export default Image;
