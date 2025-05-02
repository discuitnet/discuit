import { useDispatch } from 'react-redux';
import { Image } from '../serverTypes';
import { Post, postImageGalleryIndexUpdated } from '../slices/postsSlice';
import ImageGallery from './ImageGallery';
import ServerImage from './ServerImage';

export interface PostImageGalleryProps {
  post: Post;
  keyboardControlsOn?: boolean;
}

export default function PostImageGallery({
  post,
  keyboardControlsOn = false,
}: PostImageGalleryProps) {
  const { images } = post;

  const dispatch = useDispatch();
  const handleIndexChange = (index: number) => {
    dispatch(postImageGalleryIndexUpdated(post.publicId, index));
  };

  return (
    <ImageGallery
      className="post-image-gallery"
      startIndex={post.imageGalleryIndex}
      onIndexChange={handleIndexChange}
      keyboardControlsOn={keyboardControlsOn}
    >
      {images && images.map((image) => <ImageComponent image={image} key={image.id} />)}
    </ImageGallery>
  );
}

function ImageComponent({ image }: { image: Image }) {
  return (
    <div className="post-image-gallery-image">
      <ServerImage image={image} />
      <ServerImage className="is-blured" image={image} />
    </div>
  );
}
