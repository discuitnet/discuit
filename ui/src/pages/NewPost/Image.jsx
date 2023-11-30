import React, { useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ButtonClose } from '../../components/Button';
import { useWindowWidth } from '../../hooks';
import Img from '../../components/Image';

const Image = ({ image, onClose, disabled = false }) => {
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

  return (
    <div className="page-new-image" ref={divref}>
      {!disabled && <ButtonClose className="button-close" onClick={() => onClose()} />}
      <div className="contain-image">
        <Img
          src={url}
          backgroundColor={averageColor}
          alt="Just uploaded"
          style={{
            width: imgWidth,
            height: imgHeight,
          }}
        />
      </div>
    </div>
  );
};

Image.propTypes = {
  image: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default Image;
