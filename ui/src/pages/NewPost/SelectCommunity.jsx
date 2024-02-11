/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDelayedEffect, useQuery } from '../../hooks';
import { useDispatch } from 'react-redux';
import { snackAlertError } from '../../slices/mainSlice';
import { kRound, mfetchjson, selectImageCopyURL } from '../../helper';

const SelectCommunity = ({ initial = '', onFocus, onChange, disabled = false }) => {
  const dispatch = useDispatch();

  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    (async function () {
      try {
        const communities = await mfetchjson('/api/communities');
        setSuggestions(communities);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, []);
  const [value, setValue] = useState(initial);
  const [focus, setFocus] = useState(false);
  const query = useQuery();
  useEffect(() => {
    const name = query.get('community');
    if (name === null || name === '') return;
    (async () => {
      try {
        const comm = await mfetchjson(`/api/communities/${name}?byName=true`);
        setValue(comm.name);
        onChange(comm);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    })();
  }, []);

  const handleChange = (e) => setValue(e.target.value);
  useDelayedEffect(
    () => {
      (async function () {
        try {
          const communities = await mfetchjson(`/api/communities?q=${value}&limit=10`);
          setSuggestions(communities);
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [value],
    200
  );

  const [index, _setIndex] = useState(-1);
  const setIndex = (down = true) => {
    _setIndex((i) => {
      if (i === -1) return 0;
      let ni = i + (down ? 1 : -1);
      if (down && ni >= suggestions.length) {
        ni = 0;
      } else if (ni <= -1) {
        ni = suggestions.length - 1;
      }
      return ni;
    });
  };
  useEffect(() => {
    _setIndex(-1);
  }, [focus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setIndex(!e.shiftKey);
    } else if (e.key === 'ArrowDown') {
      setIndex(!e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      setIndex(e.shiftKey);
    } else if (e.key === 'Enter') {
      let selected = index;
      if (suggestions.length === 1) selected = 0;
      if (selected !== -1) {
        _setIndex(-1);
        setValue(suggestions[selected].name);
        setFocus(false);
        document.querySelector('textarea').focus();
        onChange(suggestions[selected]);
      }
    } else if (e.key === 'Escape') {
      setFocus(false);
    }
  };

  const inputRef = useRef();
  const handleFocus = () => {
    setFocus(true);
    if (onFocus) onFocus();
    inputRef.current.select();
  };

  const ref = useRef(null);
  useEffect(() => {
    const onBodyClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setFocus(false);
      }
    };
    document.addEventListener('click', onBodyClick);
    return () => {
      document.removeEventListener('click', onBodyClick);
    };
  }, []);
  const handleSuggestClick = (suggestion) => {
    setValue(suggestion.name);
    setFocus(false);
    onChange(suggestion);
  };

  const isActive = focus && suggestions.length !== 0;

  return (
    <div className={'page-new-select' + (isActive ? ' is-active' : '')} ref={ref}>
      <div className="page-new-select-input">
        <input
          ref={inputRef}
          className={'card' + (isActive ? ' is-active' : '')}
          type="text"
          placeholder="Select a community"
          onFocus={handleFocus}
          onChange={handleChange}
          value={value}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          focus={focus.toString()}
        />
        <svg version="1.1" x="0px" y="0px" viewBox="0 0 512.005 512.005" fill="currentColor">
          <path
            d="M508.885,493.784L353.109,338.008c32.341-35.925,52.224-83.285,52.224-135.339c0-111.744-90.923-202.667-202.667-202.667
			S0,90.925,0,202.669s90.923,202.667,202.667,202.667c52.053,0,99.413-19.883,135.339-52.245l155.776,155.776
			c2.091,2.091,4.821,3.136,7.552,3.136c2.731,0,5.461-1.045,7.552-3.115C513.045,504.707,513.045,497.965,508.885,493.784z
			 M202.667,384.003c-99.989,0-181.333-81.344-181.333-181.333S102.677,21.336,202.667,21.336S384,102.68,384,202.669
			S302.656,384.003,202.667,384.003z"
          />
        </svg>
      </div>
      {isActive && !disabled && (
        <div className="page-new-select-suggest">
          {suggestions.map((s, i) => (
            <div
              role="button"
              tabIndex={0}
              className={'page-new-select-suggest-item' + (i === index ? ' is-hovering' : '')}
              key={i}
              onClick={() => handleSuggestClick(s)}
            >
              <img src={selectImageCopyURL('tiny', s.proPic)} alt="" />
              <div className="page-new-select-suggest-name">{s.name}</div>
              <div className="page-new-select-suggest-detail">{kRound(s.noMembers)} members</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

SelectCommunity.propTypes = {
  initial: PropTypes.string,
  onFocus: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default SelectCommunity;
