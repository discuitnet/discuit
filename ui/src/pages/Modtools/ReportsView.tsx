import React from 'react';
import DashboardPage from '../../components/Dashboard/DashboardPage';
import Dropdown from '../../components/Dropdown';

export interface ReportsViewProps {
  title: string;
  noPosts?: number;
  noComments?: number;
  filter?: string;
  setFilter?: (filter: string) => void;
  children: React.ReactNode;
}

const ReportsView = ({
  title,
  noPosts = 0,
  noComments = 0,
  filter,
  setFilter,
  children,
}: ReportsViewProps) => {
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
    <DashboardPage className="modtools-reports" title={title}>
      {filter && (
        <div className="modtools-reports-filters">
          <Dropdown
            containerStyle={{ minWidth: '200px' }}
            target={
              <button
                style={{ width: '100%', justifyContent: 'flex-start' }}
                className={'button-text' + (active ? ' is-active' : '') + ' modtools-reports-type'}
              >
                {active?.text}
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
                    onClick={() => setFilter && setFilter(item.filter)}
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
    </DashboardPage>
  );
};

export default ReportsView;
