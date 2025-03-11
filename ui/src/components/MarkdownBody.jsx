/* eslint-disable no-unused-vars */
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from './Link';

const isInternalLink = (link) => {
  try {
    const url = new URL(link, `${window.location.protocol}//${window.location.host}`);
    if (
      url.hostname === window.location.hostname &&
      url.protocol === window.location.protocol &&
      url.port === window.location.port
    ) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
};

const MarkdownBody = ({ children, noLinks = false, veryBasic = false }) => {
  const renderLink = ({ node, ...props }) => {
    // eslint-disable-next-line react/prop-types
    if (isInternalLink(props.href)) {
      // eslint-disable-next-line react/prop-types
      const url = new URL(props.href, `${window.location.protocol}//${window.location.host}`);
      const to = `${url.pathname}${url.search}${url.hash}`;
      if (to.startsWith('/images/')) {
        return <a href={to} rel="noreferrer noopener nofollow" target="_blank" {...props} />;
      }
      return <Link to={to} {...props} />;
    }
    return <a target="_blank" rel="noreferrer noopener nofollow" {...props} />;
  };
  const config = {
    h1: ({ node, ...props }) => <div className="h1" {...props} />,
    h2: ({ node, ...props }) => <div className="h2" {...props} />,
    h3: ({ node, ...props }) => <div className="h3" {...props} />,
    h4: ({ node, ...props }) => <div className="h4" {...props} />,
    h5: ({ node, ...props }) => <div className="h5" {...props} />,
    h6: ({ node, ...props }) => <div className="h6" {...props} />,
    a: noLinks ? ({ node, ...props }) => <span className="anchor" {...props} /> : renderLink,
    img: noLinks
      ? ({ node, src }) => <span className="anchor">{src}</span>
      : ({ node, src }) => (
          <a target="_blank" rel="noreferrer noopener nofollow" href={src}>
            {src}
          </a>
        ),
    pre: ({ node, children }) => (
      <div className="markdown-body-pre-box">
        <pre>{children}</pre>
      </div>
    ),
  };
  const veryBasicConfig = {
    h1: ({ node, ...props }) => <div className="" {...props} />,
    h2: ({ node, ...props }) => <div className="" {...props} />,
    h3: ({ node, ...props }) => <div className="" {...props} />,
    h4: ({ node, ...props }) => <div className="" {...props} />,
    h5: ({ node, ...props }) => <div className="" {...props} />,
    h6: ({ node, ...props }) => <div className="" {...props} />,
    a: noLinks ? ({ node, ...props }) => <span className="anchor" {...props} /> : renderLink,
    img: noLinks
      ? ({ node, src }) => <span className="anchor">{src}</span>
      : ({ node, src }) => (
          <a target="_blank" rel="noreferrer noopener nofollow" href={src}>
            {src}
          </a>
        ),
    pre: ({ node, children }) => (
      <div className="markdown-body-pre-box">
        <pre>{children}</pre>
      </div>
    ),
    hr: () => null,
  };
  return (
    <div className="markdown-body">
      {children && (
        <ReactMarkdown
          components={veryBasic ? veryBasicConfig : config}
          remarkPlugins={[remarkGfm]}
          skipHtml
        >
          {children}
        </ReactMarkdown>
      )}
    </div>
  );
};

MarkdownBody.propTypes = {
  children: PropTypes.string,
  noLinks: PropTypes.bool,
  veryBasic: PropTypes.bool,
};

export default MarkdownBody;
