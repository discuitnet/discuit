import { useState } from 'react';
import Dropdown from '../../components/Dropdown';

const options = ['Top', 'Latest', 'Oldest'];

const CommentsSortButton = ({
  defaultSort = options[0],
  onSortChange,
}: {
  defaultSort: string;
  onSortChange: (sort: string) => void;
}) => {
  const [sort, _setSort] = useState(defaultSort);
  const setSort = (newVal: string) => {
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

export default CommentsSortButton;
