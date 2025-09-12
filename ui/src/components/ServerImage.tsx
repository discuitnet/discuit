import { Image as ImageType } from '../serverTypes';
import Image, { ImageProps } from './Image';

export interface ServerImageProps extends ImageProps {
  image: ImageType;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ServerImage({ onLoad, image, sizes, style = {}, src, ...props }: ServerImageProps) {
  let srcset = '';
  if (image.copies) {
    for (let i = 0; i < image.copies.length; i++) {
      const copy = image.copies[i];
      if (copy.objectFit === 'cover') {
        continue;
      }
      srcset += (i > 0 ? ', ' : '') + `${copy.url} ${copy.width}w`;
    }
  }
  srcset += (srcset !== '' ? ', ' : '') + `${image.url} ${image.width}w`;
  if (!sizes) sizes = '(max-width: 768px) 358px, 647px';

  return (
    <Image
      onLoad={onLoad}
      srcSet={srcset}
      sizes={sizes}
      src={image.url}
      alt={image.altText || ''}
      style={style}
      backgroundColor={style.backgroundColor ?? image.averageColor}
      {...props}
    />
  );
}

export default ServerImage;
