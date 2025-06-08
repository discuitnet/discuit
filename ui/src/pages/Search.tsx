import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router';

const Search = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get('q') || '';

  const [opacity, setOpacity] = useState(0);
  const handleImageLoad = () => {
    setOpacity(1);
  };

  const googleParams = new URLSearchParams();
  googleParams.set('q', `${query} site:${window.location.hostname}`);
  const googleHref = `https://www.google.com/search?${googleParams.toString()}`;

  return (
    <div
      className="page-content page-search wrap"
      style={{ opacity: opacity, transition: 'all 1s' }}
    >
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="search-content">
        <p>{`Showing results for "${query}"`}</p>
        <img className="big-gulps" alt="Guy furiously smashes computer." onLoad={handleImageLoad} />
        <div className="coming-to-town">Coming soon...!</div>
        <a className="button button-main" href={googleHref} target="_blank" rel="noreferrer">
          Search on Google for now
        </a>
      </div>
    </div>
  );
};

export default Search;
