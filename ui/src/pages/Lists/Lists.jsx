import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Link from '../../components/Link';
import Dropdown from '../../components/Dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import { mfetch, mfetchjson, stringCount, timeAgo } from '../../helper';
import { selectUser } from '../../slices/usersSlice';
import { useFetchUser, useFetchUsersLists } from '../../hooks';
import PageLoading from '../../components/PageLoading';
import NotFound from '../NotFound';
import { listsFilterChanged, listsOrderChanged } from '../../slices/listsSlice';
import { EditListForm } from './List';
import Modal from '../../components/Modal';
import { ButtonClose } from '../../components/Button';

const Lists = () => {
  const dispatch = useDispatch();
  const [isNewListOpen, setIsNewListOpen] = useState(false);

  const toggleNewListForm = () => {
    setIsNewListOpen(!isNewListOpen);
  };

  const handleSuccess = () => {
    toggleNewListForm();
    dispatch(snackAlert('List created!', 'success'));
    // TODO: Append new list to lists.
    window.location.reload();
  };

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

  const authedUser = useSelector((state) => state.main.user);

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
              {authedUser && authedUser.username === username && renderFilterDropdown()}
              <button onClick={toggleNewListForm}>New list</button>
            </div>
          </div>
          <Modal open={isNewListOpen} onClose={toggleNewListForm}>
            <div className="modal-card save-modal is-compact-mobile is-page-new">
              <div className="modal-card-head">
                <div className="modal-card-title">Create list</div>
                <ButtonClose onClick={toggleNewListForm} />
              </div>
              <EditListForm onCancel={toggleNewListForm} onSuccess={handleSuccess} />
            </div>
          </Modal>
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
  const { username, name, displayName } = list;
  return (
    <Link className="list-thumb" to={`/@${username}/lists/${name}`}>
      <div className="list-thumb-top">
        <div className="list-thumb-image is-default">
          {/*
          <img
            src="https://discuit.net/images/17cad58e3fb9872ece91fc87.jpeg?sig=hgUa8EBH96UoIW4YsR5qASk36arQsP_iELgJmV18QBw"
            alt="Cutest little doggie"
          />*/}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 5.25H14C13.59 5.25 13.25 4.91 13.25 4.5C13.25 4.09 13.59 3.75 14 3.75H21C21.41 3.75 21.75 4.09 21.75 4.5C21.75 4.91 21.41 5.25 21 5.25Z"
              fill="currentColor"
            ></path>
            <path
              d="M21 10.25H14C13.59 10.25 13.25 9.91 13.25 9.5C13.25 9.09 13.59 8.75 14 8.75H21C21.41 8.75 21.75 9.09 21.75 9.5C21.75 9.91 21.41 10.25 21 10.25Z"
              fill="currentColor"
            ></path>
            <path
              d="M21 15.25H3C2.59 15.25 2.25 14.91 2.25 14.5C2.25 14.09 2.59 13.75 3 13.75H21C21.41 13.75 21.75 14.09 21.75 14.5C21.75 14.91 21.41 15.25 21 15.25Z"
              fill="currentColor"
            ></path>
            <path
              d="M21 20.25H3C2.59 20.25 2.25 19.91 2.25 19.5C2.25 19.09 2.59 18.75 3 18.75H21C21.41 18.75 21.75 19.09 21.75 19.5C21.75 19.91 21.41 20.25 21 20.25Z"
              fill="currentColor"
            ></path>
            <path
              d="M7.92 3.5H5.08C3.68 3.5 3 4.18 3 5.58V8.43C3 9.83 3.68 10.51 5.08 10.51H7.93C9.33 10.51 10.01 9.83 10.01 8.43V5.58C10 4.18 9.32 3.5 7.92 3.5Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>
      <div className="list-thumb-bottom">
        <div className="list-thumb-name">
          <span className="is-name">{displayName}</span>
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
