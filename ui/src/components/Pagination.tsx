export interface PaginationProps {
  onClick: (page: number) => void;
  noPages: number;
  current: number;
}

function Pagination({ onClick, noPages, current }: PaginationProps) {
  const renderItems = () => {
    const items: React.ReactNode[] = [];
    const pushButton = (page: number) => {
      items.push(
        <button
          key={`btn-${page}`}
          className={'pagination-item' + (page === current ? ' is-selected' : '')}
          onClick={() => onClick(page)}
        >
          {page}
        </button>
      );
    };
    if (noPages < 10) {
      for (let i = 1; i < noPages + 1; i++) pushButton(i);
    } else {
      for (let i = 1; i < 9; i++) pushButton(i);
      items.push(
        <div key="dots" className="pagination-item">
          ...
        </div>
      );
      if (current > 8) {
        pushButton(current);
        if (current + 1 !== noPages && current !== noPages) {
          items.push(
            <div key="dots-2" className="pagination-item">
              ...
            </div>
          );
        }
      }
      if (current !== noPages) pushButton(noPages);
    }
    return items;
  };

  return (
    <div className="pagination">
      <div className="left">{renderItems()}</div>
      <div className="right">
        <button
          className="pagination-item"
          onClick={() => onClick(current - 1)}
          disabled={current - 1 < 1}
        >
          Previous
        </button>
        <button
          className="pagination-item"
          onClick={() => onClick(current + 1)}
          disabled={current + 1 > noPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;
