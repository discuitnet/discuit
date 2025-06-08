import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Post } from '../../serverTypes';

const YoutubeEmbed = ({ url }: { url: string }) => {
  // Render only if the div is in view.
  const [ref, inView] = useInView({
    rootMargin: '200px 0px',
    threshold: 0,
    initialInView: false,
  });
  const [renderedOnce, setRenderedOnce] = useState(inView);
  useEffect(() => {
    if (inView) {
      setRenderedOnce(true);
    }
  }, [inView]);

  // Set component width and height.
  const calcSize = (width: number) => {
    return { width: width, height: width / 1.777 };
  };
  const [size, setSize] = useState(calcSize(500));
  const outerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (outerRef.current) {
      const { width } = outerRef.current.getBoundingClientRect();
      setSize(calcSize(width));
    }
  }, []);

  // To prevent the white-flash you see while an iframe is loading.
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!url) {
    return null;
  }

  let videoId = '';
  const u = new URL(url);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) {
    // fix embeds for shorts/live, which seem to only appear on youtube.com and not youtu.be
    const pathArray = u.pathname.split('/');
    if (pathArray.includes('shorts') || pathArray.includes('live')) {
      videoId = pathArray[2];
    } else {
      const params = new URLSearchParams(u.search);
      videoId = params.get('v') || '';
    }
  } else if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
    videoId = u.pathname;
  }

  return (
    <div className="post-card-embed" ref={outerRef} style={{ height: size.height }}>
      <div ref={ref}>
        {(inView || renderedOnce) && (
          <iframe
            style={{
              visibility: iframeLoaded ? 'visible' : 'hidden',
            }}
            onLoad={() => setIframeLoaded(true)}
            width={size.width}
            height={size.height}
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay;clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        )}
      </div>
    </div>
  );
};

YoutubeEmbed.propTypes = {
  url: PropTypes.string.isRequired,
};

export default function embeddedElement(link: Post['link']) {
  const ret: {
    isEmbed: boolean;
    element: React.ReactNode;
  } = {
    isEmbed: false,
    element: null,
  };
  if (!link) {
    return ret;
  }

  type Mapping = {
    [key: string]: {
      hostnames: string[];
      render: (url: string) => React.ReactNode;
    };
  };
  const mapping: Mapping = {
    youtube: {
      hostnames: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
      render: (url: string) => <YoutubeEmbed url={url} />,
    },
  };

  let match;
  for (const site in mapping) {
    const { hostnames } = mapping[site];
    const found = hostnames.find((host) => host === link.hostname);
    if (found) {
      match = mapping[site];
      break;
    }
  }
  if (match) {
    ret.isEmbed = true;
    ret.element = match.render(link.url);
  }
  return ret;
}
