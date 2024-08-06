import PropTypes from 'prop-types';
import React, { useState } from 'react';
import Dropdown from '../../components/Dropdown';

const options = ['Top', 'Latest', 'Oldest'];

const CommentsSortButton = ({ defaultSort = options[0], onSortChange }) => {
  const [sort, _setSort] = useState(defaultSort);
  const setSort = (newVal) => {
    _setSort(newVal);
    if (onSortChange) onSortChange(newVal);
  };

  return (
    <div className="post-comments-sort">
      <Dropdown
        target={<div className="button button-text">{`Sort by: ${sort}`}</div>}
        aligned="right"
      >
        <div className="dropdown-list">
          {options.map((opt) => (
            <button key={opt} className="button-clear dropdown-item" onClick={() => setSort(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
};

CommentsSortButton.propTypes = {
  defaultSort: PropTypes.string,
  onSortChange: PropTypes.func.isRequired,
};

export default CommentsSortButton;
