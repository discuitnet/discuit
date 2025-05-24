import { useImageLoaded } from '../../hooks';
import { Image } from '../../serverTypes';

export interface LinkImageProps {
  image: Image;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
  isImagePost?: boolean;
}

const LinkImage = ({ image, loading = 'lazy', isImagePost = false }: LinkImageProps) => {
  const { src, size } = (() => {
    const imageCopyName = isImagePost ? 'tiny' : window.innerWidth > 768 ? 'desktop' : 'mobile';
    const matches = (image.copies || []).filter((copy) => copy.name === imageCopyName);
    let copy;
    if (matches.length === 0) {
      copy = image;
      console.error(`No matching image copy found for image: ${image.url}`);
    } else {
      copy = matches[0];
    }
    return {
      src: copy.url,
      size: {
        width: copy.width,
        height: copy.height,
      },
    };
  })();

  const [loaded, handleLoad] = useImageLoaded();

  return (
    <div
      className="post-card-link-image-img"
      style={{
        backgroundColor: image.averageColor,
        backgroundImage: loaded ? `url('${src}')` : 'none',
        backgroundPosition: 'center',
      }}
    >
      <img
        src={src}
        alt=""
        loading={loading}
        width={size.width}
        height={size.height}
        onLoad={handleLoad}
      />
    </div>
  );
};

export default LinkImage;
