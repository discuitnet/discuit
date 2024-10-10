import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onKeyEnter } from '../../helper';
import { ButtonClose, ButtonSearch } from '../Button';
import Modal from '../Modal';

const Search = ({ autoFocus = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const inputRef = useRef(null);
  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement;
      if (active.nodeName === 'BODY' && e.key === '/') {
        inputRef.current.focus();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const getGoogleURL = (query) => {
    const q = encodeURIComponent(`${query} site:${window.location.hostname}`);
    return `https://www.google.com/search?q=${q}`;
  };

  const getApiUrl = (query) => `/api/search?q=${encodeURIComponent(query)}&index=communities`;

  // Fallback on Google search until search is implemented.
  const handleSearch = async () => {
    if (!import.meta.env.VITE_SEARCHENABLED) {
      const win = window.open(getGoogleURL(searchQuery), '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // poppup was blocked
        setSearchModalOpen(true);
      }
      return;
    }

    try {
      const response = await fetch(getApiUrl(searchQuery));
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setSearchResults(data); // Assuming the API returns an array of results
      console.log(data); // For demonstration, you might want to display these results in the UI
      setSearchModalOpen(true);
    } catch (error) {
      console.error('There was a problem with your fetch operation:', error);
    }
  };
  const linkRef = useCallback((node) => {
    if (node !== null) setTimeout(() => node.focus(), 10);
  });

  return (
    <>
      <Modal open={searchModalOpen} onClose={() => setSearchModalOpen(false)}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">Search</div>
            <ButtonClose onClick={() => setSearchModalOpen(false)} />
          </div>

          {!import.meta.env.VITE_SEARCHENABLED && (
            <div className="modal-card-content">
              <p style={{ marginBottom: 'var(--gap)' }}>
                {`Searching is not enabled on this site. You can click the button below to search on Google. It'll show only results from this website.`}
              </p>
              <a
                className="button button-main"
                href={getGoogleURL(searchQuery)}
                target="_blank"
                rel="noreferrer"
                ref={linkRef}
                onClick={() => setSearchModalOpen(false)}
              >
                Search on Google for now
              </a>
            </div>
          )}

          {import.meta.env.VITE_SEARCHENABLED && (
            <div className="modal-card-content">
              <p
                style={{ marginBottom: 'var(--gap)' }}
              >{`Found ${searchResults.estimatedTotalHits} results for "${searchQuery}" in ${searchResults.processingTimeMs}ms`}</p>

              {/* Only if hits exists */}
              {searchResults.hits && searchResults.hits.length > 0 && (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {searchResults.hits.map((hit) => (
                    <li key={hit.id} style={{ marginBottom: 'var(--gap)' }}>
                      <a
                        href={'/' + hit.name}
                        ref={linkRef}
                        onClick={() => setSearchModalOpen(false)}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {hit.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
      <div className="input-search">
        <input
          autoFocus={autoFocus}
          ref={inputRef}
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => onKeyEnter(e, handleSearch)}
          onSubmit={handleSearch}
        />
        <ButtonSearch onClick={handleSearch} />
      </div>
    </>
  );
};

Search.propTypes = {
  autoFocus: PropTypes.bool,
};

export default Search;
