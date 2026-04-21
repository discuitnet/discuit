import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Post } from '../../serverTypes';

const YoutubeEmbed = ({ url }: { url: string }) => {

  // match the way YouTube parses timestamps:
  // pure number: interpret as seconds
  // xxxsyyym (either order, either can be missing): as xxx seconds + yyy minutes
  // anything else: start at time 0
  const timestampStringToNum = (s: string) => {
    let n = Number(s);
    if (Number.isInteger(n)) {
      return n
    }
    let matchResult = s.match(/(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)m)?/i)
    if (matchResult === null || matchResult[0] != s) { // s is not xxxsyyym
      return 0;
    } else if (matchResult[1] && matchResult[3]) { // malformed; two minute values
      return 0;
    } else {
      let seconds = parseInt(matchResult[2]) || 0;
      let minutes = (parseInt(matchResult[1]) || 0) + (parseInt(matchResult[3]) || 0);
      return minutes * 60 + seconds;
    }
  }

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

  let videoId = '', timestampString = '', playlist = '';
  const u = new URL(url);
  const params = new URLSearchParams(u.search);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) {
    // fix embeds for shorts/live, which seem to only appear on youtube.com and not youtu.be
    const pathArray = u.pathname.split('/');
    if (pathArray.includes('shorts') || pathArray.includes('live')) {
      videoId = pathArray[2];
    } else {
      videoId = params.get('v') || '';
    }
  } else if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
    videoId = u.pathname;
  }
  playlist = params.get('list') || '';
  timestampString = params.get('t') || '';
  let timestamp = timestampStringToNum(timestampString);
  let additionalParams = '';
  if (timestamp != 0) {
    additionalParams = `?start=${timestamp}`
  }
  if (playlist != '') {
    additionalParams += (additionalParams != '' ? '&' : '?') + `listType=playlist&list=${playlist}`
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
            src={`https://www.youtube-nocookie.com/embed/${videoId}${additionalParams}`}
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
