import { useEffect, useState } from 'react';

export interface ImageGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  startIndex?: number;
  onIndexChange?: (index: number) => void;
  keyboardControlsOn?: boolean;
}

export default function ImageGallery({
  className,
  children,
  startIndex = 0,
  onIndexChange,
  keyboardControlsOn = false,
  ...props
}: ImageGalleryProps) {
  const numImages = Array.isArray(children) ? children.length : 1;

  const nextIcon = (
    <svg viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM14.79 12.53L11.26 16.06C11.11 16.21 10.92 16.28 10.73 16.28C10.54 16.28 10.35 16.21 10.2 16.06C9.91 15.77 9.91 15.29 10.2 15L13.2 12L10.2 9C9.91 8.71 9.91 8.23 10.2 7.94C10.49 7.65 10.97 7.65 11.26 7.94L14.79 11.47C15.09 11.76 15.09 12.24 14.79 12.53Z"
        fill="#ffffff"
      />
    </svg>
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(startIndex);
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentImageIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageIndex]);

  const renderImages = () => {
    let img1, img2, img3;
    if (Array.isArray(children)) {
      img2 = children[currentImageIndex];
      if (currentImageIndex > 0) {
        img1 = children[currentImageIndex - 1];
      }
      if (currentImageIndex < children.length - 1) {
        img3 = children[currentImageIndex + 1];
      }
    } else {
      img2 = children;
    }
    return (
      <div className="image-gallery-images">
        <div className="image-gallery-image flex flex-center is-slot-1">{img1}</div>
        <div className="image-gallery-image flex flex-center is-slot-2">{img2}</div>
        <div className="image-gallery-image flex flex-center is-slot-3">{img3}</div>
      </div>
    );
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < numImages; i++) {
      dots.push(
        <div
          className={'image-gallery-dot' + (currentImageIndex === i ? ' is-highlighted' : '')}
          key={`dot-${i}`}
        ></div>
      );
    }
    return <div className="image-gallery-dots">{dots}</div>;
  };

  const showLeftArrow = numImages > 1 && currentImageIndex > 0;
  const showRightArrow = numImages > 1 && currentImageIndex < numImages - 1;

  useEffect(() => {
    if (keyboardControlsOn) {
      const onkeydown = (event: KeyboardEvent) => {
        if (!event.target) {
          return;
        }
        const target = event.target as Element & { isContentEditable: boolean };
        if (
          target.nodeName === 'TEXTAREA' ||
          target.nodeName === 'INPUT' ||
          target.isContentEditable
        ) {
          return;
        }
        if (showLeftArrow && event.key === 'ArrowLeft') {
          setCurrentImageIndex((n) => n - 1);
        }
        if (showRightArrow && event.key === 'ArrowRight') {
          setCurrentImageIndex((n) => n + 1);
        }
      };
      window.addEventListener('keydown', onkeydown);
      return () => {
        window.removeEventListener('keydown', onkeydown);
      };
    }
  }, [showLeftArrow, showRightArrow, keyboardControlsOn]);

  return (
    <div className={'image-gallery' + (className ? ` ${className}` : '')} {...props}>
      <div
        className="image-gallery-next-btn is-button is-previous"
        onClick={() => setCurrentImageIndex(showLeftArrow ? (n) => n - 1 : numImages - 1)}
      >
        {nextIcon}
      </div>
      <div
        className="image-gallery-next-btn is-button"
        onClick={() => setCurrentImageIndex(showRightArrow ? (n) => n + 1 : 0)}
      >
        {nextIcon}
      </div>
      {renderImages()}
      {renderDots()}
    </div>
  );
}
