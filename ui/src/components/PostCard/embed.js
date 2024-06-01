import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const YoutubeEmbed = ({ url }) => {
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
  const calcSize = (width) => {
    return { width: width, height: width / 1.777 };
  };
  const [size, setSize] = useState(calcSize(500));
  const outerRef = useRef(null);
  useLayoutEffect(() => {
    const { width } = outerRef.current.getBoundingClientRect();
    setSize(calcSize(width));
  }, []);

  // To prevent the white-flash you see while an iframe is loading.
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!url) {
    return null;
  }

  let videoId = '';
  const u = new URL(url);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) {
    // fix embeds for shorts, which seem to only appear on youtube.com and not youtu.be
    let pathArray = u.pathname.split('/');
    if (pathArray.includes('shorts')) {
      videoId = pathArray[2];
    } else {
      const params = new URLSearchParams(u.search);
      videoId = params.get('v');
    }
  } else if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
    videoId = u.pathname.slice(1);
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

export default function getEmbedComponent(link) {
  const ret = {
    isEmbed: false,
    render: null,
    hostnames: [],
    url: '',
  };
  if (!link) {
    return ret;
  }
  const mapping = {
    youtube: {
      hostnames: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
      render: YoutubeEmbed,
    },
    // vimeo: {
    //   hostnames: [],
    // },
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
    ret.render = match.render;
    ret.hostnames = match.hostnames;
    ret.url = link.url;
  }
  return ret;
}
