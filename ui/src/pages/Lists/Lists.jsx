import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Link from '../../components/Link';
import Dropdown from '../../components/Dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { snackAlertError } from '../../slices/mainSlice';
import { mfetch, mfetchjson, stringCount, timeAgo } from '../../helper';
import { selectUser } from '../../slices/usersSlice';
import { useFetchUser, useFetchUsersLists } from '../../hooks';
import PageLoading from '../../components/PageLoading';
import NotFound from '../NotFound';
import { listsFilterChanged, listsOrderChanged } from '../../slices/listsSlice';

const Lists = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    document.body.classList.add('is-not-gray');
    return () => {
      document.body.classList.remove('is-not-gray');
    };
  }, []);

  const { username } = useParams();
  const { user, loading: userLoading, error: userError } = useFetchUser(username);
  const {
    lists,
    order,
    filter,
    loading: listsLoading,
    error: listsError,
  } = useFetchUsersLists(username);

  if (userLoading || listsLoading) {
    return <PageLoading />;
  }

  if (userError !== null || listsError !== null) {
    return (
      <div className="page-content wrap">
        <h1>Something went wrong!</h1>
      </div>
    );
  }

  if (!user) {
    // Page loaded but user not found.
    return <NotFound />;
  }

  const orderOptions = {
    name: 'A-Z',
    lastAdded: 'Last added',
  };
  const renderOrderDropdown = () => {
    console.log(`order is: `, order);
    const items = [];
    for (const [key, value] of Object.entries(orderOptions)) {
      items.push(
        <div
          key={key}
          className="dropdown-item"
          onClick={() => dispatch(listsOrderChanged(username, key))}
        >
          {value}
        </div>
      );
    }
    return (
      <Dropdown target={orderOptions[order]}>
        <div className="dropdown-list">{items}</div>
      </Dropdown>
    );
  };

  const filterOptions = {
    all: 'All',
    public: 'Public',
    private: 'Private',
  };
  const renderFilterDropdown = () => {
    console.log(`filter is: `, filter);
    const items = [];
    for (const [key, value] of Object.entries(filterOptions)) {
      items.push(
        <div
          key={key}
          className="dropdown-item"
          onClick={() => dispatch(listsFilterChanged(username, key))}
        >
          {value}
        </div>
      );
    }
    return (
      <Dropdown target={filterOptions[filter]}>
        <div className="dropdown-list">{items}</div>
      </Dropdown>
    );
  };

  return (
    <div className="page-content wrap page-grid page-lists">
      <Sidebar />
      <main>
        <div className="lists-head">
          <h1>
            <Link to={`/@${username}`}>@{username}</Link>
            {"'s lists"}
          </h1>
        </div>
        <section className="lists-main">
          <div className="lists-main-head">
            <div className="left">
              {renderOrderDropdown()}
              {renderFilterDropdown()}
            </div>
          </div>
          <div className="lists-main-main">
            {lists.map((list) => (
              <ListThumbnail key={list.id} list={list} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Lists;

const ListThumbnail = ({ list }) => {
  // TODO: Display list private status.
  return (
    <Link className="list-thumb" to={`/@${list.username}/lists/${list.name}`}>
      <div className="list-thumb-top">
        <div className="list-thumb-image">
          <img
            src="https://discuit.net/images/17cad58e3fb9872ece91fc87.jpeg?sig=hgUa8EBH96UoIW4YsR5qASk36arQsP_iELgJmV18QBw"
            alt="Cutest little doggie"
          />
        </div>
      </div>
      <div className="list-thumb-bottom">
        <div className="list-thumb-name">
          <span className="is-name">{list.name}</span>
          <span className="is-age">{timeAgo(list.lastUpdatedAt, '', false, true)}</span>
        </div>
        <div className="list-thumb-count">{stringCount(list.numItems, false, 'item')}</div>
      </div>
    </Link>
  );
};

ListThumbnail.propTypes = {
  list: PropTypes.object.isRequired,
};
