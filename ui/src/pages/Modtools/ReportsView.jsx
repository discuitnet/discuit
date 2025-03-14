import PropTypes from 'prop-types';
import React from 'react';
import Dropdown from '../../components/Dropdown';

const ReportsView = ({ title, noPosts, noComments, filter, setFilter, children }) => {
  const noAll = typeof noPosts === 'number' ? noPosts + noComments : null;
  const filterButtons = [
    {
      filter: 'all',
      text: `Posts & comments` + (noAll == null ? '' : ` (${noAll})`),
    },
    {
      filter: 'posts',
      text: `Posts` + (noAll == null ? '' : ` (${noPosts})`),
    },
    {
      filter: 'comments',
      text: `Comments` + (noAll == null ? '' : ` (${noComments})`),
    },
  ];

  const active = filterButtons.find((item) => item.filter === filter);

  return (
    <div className="modtools-content modtools-reports">
      <div className="modtools-content-head">
        <div className="modtools-title">{title}</div>
      </div>
      {filter && (
        <div className="modtools-reports-filters">
          <Dropdown
            containerStyle={{ minWidth: '200px' }}
            target={
              <button
                style={{ width: '100%', justifyContent: 'flex-start' }}
                className={'button-text' + (active ? ' is-active' : '') + ' modtools-reports-type'}
              >
                {active.text}
              </button>
            }
          >
            <div className="dropdown-list">
              {filterButtons
                .filter((item) => item.filter !== filter)
                .map((item) => (
                  <button
                    key={item.filter}
                    className="button-clear dropdown-item"
                    onClick={() => setFilter(item.filter)}
                  >
                    {item.text}
                  </button>
                ))}
            </div>
          </Dropdown>
          {/*<div className="modtools-reports-layout">Layout</div>*/}
        </div>
      )}
      <div className="modtools-reports-content">{children}</div>
    </div>
  );
};

ReportsView.propTypes = {
  title: PropTypes.string.isRequired,
  noPosts: PropTypes.number,
  noComments: PropTypes.number,
  filter: PropTypes.string,
  setFilter: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)])
    .isRequired,
};

export default ReportsView;
