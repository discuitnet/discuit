import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import MiniFooter from '../../components/MiniFooter';
import { Helmet } from 'react-helmet-async';
import Link from '../../components/Link';
import Modal from '../../components/Modal';
import { ButtonClose, ButtonMore } from '../../components/Button';
import Input, { InputWithCount } from '../../components/Input';
import { APIError, dateString1, mfetch, mfetchjson, stringCount, timeAgo } from '../../helper';
import { useDispatch, useSelector } from 'react-redux';
import { listsAdded, snackAlertError } from '../../slices/mainSlice';
import {
  FeedItem,
  feedInViewItemsUpdated,
  feedItemHeightChanged,
  feedReloaded,
  feedUpdated,
  selectFeed,
  selectFeedInViewItems,
} from '../../slices/feedsSlice';
import Feed from '../../components/Feed';
import { MemorizedPostCard } from '../../components/PostCard/PostCard';
import { selectUser } from '../../slices/usersSlice';
import { MemorizedComment } from '../User/Comment';
import PageLoading from '../../components/PageLoading';
import NotFound from '../NotFound';
import { listAdded, selectList } from '../../slices/listsSlice';
import { useInputUsername } from '../../hooks';
import { usernameMaxLength } from '../../config';
import { useHistory } from 'react-router-dom';
import Dropdown from '../../components/Dropdown';

const List = () => {
  const dispatch = useDispatch();
  const { username, listName: listname } = useParams();

  const [editModalOpen, setEditModalOpen] = useState(false);

  const list = useSelector(selectList(username, listname));
  const [listLoading, setListLoading] = useState(list ? 'loaded' : 'loading');

  const listEndpoint = `/api/users/${username}/lists/${listname}`;
  useEffect(() => {
    if (listLoading !== 'loading') {
      return;
    }
    const f = async () => {
      try {
        const res = await mfetch(listEndpoint);
        if (!res.ok) {
          if (res.status === 404) {
            setListLoading('notfound');
            return;
          }
          throw new Error(await res.text());
        }
        dispatch(listAdded(username, await res.json()));
        setListLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setListLoading('error');
      }
    };
    f();
  }, [listLoading]);
  useEffect(() => {
    if (!list || list.name !== listname || list.username !== username) {
      setListLoading('loading');
    }
  }, [list, username, listname]);

  const feedEndpoint = `${listEndpoint}/items`;
  const feed = useSelector(selectFeed(feedEndpoint));
  const setFeed = (res) => {
    const feedItems = (res.items ?? []).map(
      (item) => new FeedItem(item.targetItem, item.targetType, item.id)
    );
    dispatch(feedUpdated(feedEndpoint, feedItems, res.next ?? null));
  };

  const feedLoading = feed ? feed.loading : true;
  const [feedLoadingError, setFeedLoadingError] = useState(null);

  useEffect(() => {
    if (!feedLoading) {
      return;
    }
    const f = async () => {
      try {
        const res = await mfetch(feedEndpoint);
        if (!res.ok) {
          if (res.status === 404) {
            setFeedLoadingError(new Error('feed not found'));
            return;
          }
        }
        setFeed(await res.json());
      } catch (error) {
        setFeedLoadingError(error);
        dispatch(snackAlertError(error));
      }
    };
    f();
  }, [feedEndpoint, feedLoading]);

  const [feedReloading, setFeedReloading] = useState(false);
  const fetchNextItems = async () => {
    if (feedReloading) return;
    try {
      setFeedReloading(true);
      const res = await mfetchjson(`${feedEndpoint}?next=${feed.next}`);
      setFeed(res);
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setFeedReloading(false);
    }
  };

  const user = useSelector(selectUser(username));
  const handleRenderItem = (item) => {
    if (item.type === 'post') {
      return <MemorizedPostCard initialPost={item.item} disableEmbeds={user && user.embedsOff} />;
    }
    if (item.type === 'comment') {
      return <MemorizedComment comment={item.item} />;
    }
  };

  const handleItemHeightChange = (height, item) => {
    dispatch(feedItemHeightChanged(item.key, height));
  };

  const itemsInitiallyInView = useSelector(selectFeedInViewItems(feedEndpoint));
  const handleSaveVisibleItems = (items) => {
    dispatch(feedInViewItemsUpdated(feedEndpoint, items));
  };

  const handleRemoveAllItems = async () => {
    if (!confirm('Are you sure you want to remove all items from the list?')) {
      return;
    }
    try {
      await mfetchjson(feedEndpoint, { method: 'DELETE' });
      dispatch(feedReloaded(feedEndpoint));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const history = useHistory();
  const handleDeleteList = async () => {
    if (!confirm('Are you sure you want to delete the list?')) {
      return;
    }
    try {
      await mfetchjson(listEndpoint, { method: 'DELETE' });
      const res = await mfetchjson('/api/_initial');
      dispatch(listsAdded(res.lists));
      history.replace(`/@${list.username}/lists/${name}`);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const viewer = useSelector((state) => state.main.user);
  const viewerListOwner = viewer && list && viewer.id === list.userId;

  if (feedLoading || feedLoadingError || listLoading !== 'loaded' || !list) {
    console.log('loading: ', listLoading);
    if (listLoading === 'notfound') {
      return <NotFound />;
    }
    return <PageLoading />;
  }

  return (
    <div className="page-content wrap page-grid page-list">
      <EditListModal list={list} open={editModalOpen} onClose={() => setEditModalOpen(false)} />
      <Helmet>
        <title>{`${listname} of @${username}`}</title>
      </Helmet>
      <Sidebar />
      <main className="page-middle">
        <header className="card card-padding list-head">
          <div className="list-head-main">
            <div className="list-head-top">
              <h1>{list.displayName}</h1>
              {!list.public && <div>Private</div>}
            </div>
            <Link to={`/@${list.username}`} className="list-head-user">
              @{list.username}
            </Link>
            <div className="list-head-desc">{list.description}</div>
          </div>
          {viewerListOwner && (
            <div className="list-head-actions">
              <button onClick={() => setEditModalOpen(true)}>Edit list</button>
              <Dropdown target={<ButtonMore style={{ background: 'var(--color-button)' }} />}>
                <div className="dropdown-list">
                  <div className="button-clear dropdown-item" onClick={handleRemoveAllItems}>
                    Remove all items
                  </div>
                  <div className="button-clear dropdown-item" onClick={handleDeleteList}>
                    Delete list
                  </div>
                </div>
              </Dropdown>
            </div>
          )}
        </header>
        <div className="lists-feed">
          {/*<PostsFeed feedType="all" />*/}

          <Feed
            loading={feedLoading}
            items={feed ? feed.items : []}
            hasMore={Boolean(feed ? feed.next : false)}
            onNext={fetchNextItems}
            isMoreItemsLoading={feedReloading}
            onRenderItem={handleRenderItem}
            onItemHeightChange={handleItemHeightChange}
            itemsInitiallyInView={itemsInitiallyInView}
            onSaveVisibleItems={handleSaveVisibleItems}
          />
        </div>
      </main>
      <aside className="sidebar-right">
        <div className="card card-sub list-summary">
          <div className="card-head">
            <div className="card-title">List summary</div>
          </div>
          <div className="card-content">
            <div className="card-list-item">
              {SVGs.comment}
              <div>{stringCount(list.numItems, false, 'total item')}</div>
            </div>
            <div className="card-list-item">
              {SVGs.calendar}
              <div>{`Created on ${dateString1(list.createdAt)}`}</div>
            </div>
            <div className="card-list-item">
              {SVGs.clock}
              <div>{`Last updated ${timeAgo(list.lastUpdatedAt)}`}</div>
            </div>
          </div>
        </div>
        <MiniFooter />
      </aside>
    </div>
  );
};

export default List;

const EditListModal = ({ list, open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card edit-list-modal is-compact-mobile">
        <div className="modal-card-head">
          <div className="modal-card-title">Edit list</div>
          <ButtonClose onClick={onClose} />
        </div>
        <EditListForm list={list} onCancel={onClose} onSuccess={onClose} />
      </div>
    </Modal>
  );
};

EditListModal.propTypes = {
  list: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const SVGs = {
  comment: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 7V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V7C3 4 4.5 2 8 2H16C19.5 2 21 4 21 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 4.5V6.5C14.5 7.6 15.4 8.5 16.5 8.5H18.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 17H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 5.75C7.59 5.75 7.25 5.41 7.25 5V2C7.25 1.59 7.59 1.25 8 1.25C8.41 1.25 8.75 1.59 8.75 2V5C8.75 5.41 8.41 5.75 8 5.75Z"
        fill="currentColor"
      />
      <path
        d="M16 5.75C15.59 5.75 15.25 5.41 15.25 5V2C15.25 1.59 15.59 1.25 16 1.25C16.41 1.25 16.75 1.59 16.75 2V5C16.75 5.41 16.41 5.75 16 5.75Z"
        fill="currentColor"
      />
      <path
        d="M8.5 14.4984C8.37 14.4984 8.24 14.4684 8.12 14.4184C7.99 14.3684 7.89 14.2983 7.79 14.2083C7.61 14.0183 7.5 13.7684 7.5 13.4984C7.5 13.3684 7.53 13.2384 7.58 13.1184C7.63 12.9984 7.7 12.8884 7.79 12.7884C7.89 12.6984 7.99 12.6283 8.12 12.5783C8.48 12.4283 8.93 12.5084 9.21 12.7884C9.39 12.9784 9.5 13.2384 9.5 13.4984C9.5 13.5584 9.49 13.6284 9.48 13.6984C9.47 13.7584 9.45 13.8184 9.42 13.8784C9.4 13.9384 9.37 13.9984 9.33 14.0584C9.3 14.1084 9.25 14.1583 9.21 14.2083C9.02 14.3883 8.76 14.4984 8.5 14.4984Z"
        fill="currentColor"
      />
      <path
        d="M12 14.4989C11.87 14.4989 11.74 14.4689 11.62 14.4189C11.49 14.3689 11.39 14.2989 11.29 14.2089C11.11 14.0189 11 13.7689 11 13.4989C11 13.3689 11.03 13.2389 11.08 13.1189C11.13 12.9989 11.2 12.8889 11.29 12.7889C11.39 12.6989 11.49 12.6289 11.62 12.5789C11.98 12.4189 12.43 12.5089 12.71 12.7889C12.89 12.9789 13 13.2389 13 13.4989C13 13.5589 12.99 13.6289 12.98 13.6989C12.97 13.7589 12.95 13.8189 12.92 13.8789C12.9 13.9389 12.87 13.9989 12.83 14.0589C12.8 14.1089 12.75 14.1589 12.71 14.2089C12.52 14.3889 12.26 14.4989 12 14.4989Z"
        fill="currentColor"
      />
      <path
        d="M15.5 14.4989C15.37 14.4989 15.24 14.4689 15.12 14.4189C14.99 14.3689 14.89 14.2989 14.79 14.2089C14.75 14.1589 14.71 14.1089 14.67 14.0589C14.63 13.9989 14.6 13.9389 14.58 13.8789C14.55 13.8189 14.53 13.7589 14.52 13.6989C14.51 13.6289 14.5 13.5589 14.5 13.4989C14.5 13.2389 14.61 12.9789 14.79 12.7889C14.89 12.6989 14.99 12.6289 15.12 12.5789C15.49 12.4189 15.93 12.5089 16.21 12.7889C16.39 12.9789 16.5 13.2389 16.5 13.4989C16.5 13.5589 16.49 13.6289 16.48 13.6989C16.47 13.7589 16.45 13.8189 16.42 13.8789C16.4 13.9389 16.37 13.9989 16.33 14.0589C16.3 14.1089 16.25 14.1589 16.21 14.2089C16.02 14.3889 15.76 14.4989 15.5 14.4989Z"
        fill="currentColor"
      />
      <path
        d="M8.5 17.9992C8.37 17.9992 8.24 17.9692 8.12 17.9192C8 17.8692 7.89 17.7992 7.79 17.7092C7.61 17.5192 7.5 17.2592 7.5 16.9992C7.5 16.8692 7.53 16.7392 7.58 16.6192C7.63 16.4892 7.7 16.3792 7.79 16.2892C8.16 15.9192 8.84 15.9192 9.21 16.2892C9.39 16.4792 9.5 16.7392 9.5 16.9992C9.5 17.2592 9.39 17.5192 9.21 17.7092C9.02 17.8892 8.76 17.9992 8.5 17.9992Z"
        fill="currentColor"
      />
      <path
        d="M12 17.9992C11.74 17.9992 11.48 17.8892 11.29 17.7092C11.11 17.5192 11 17.2592 11 16.9992C11 16.8692 11.03 16.7392 11.08 16.6192C11.13 16.4892 11.2 16.3792 11.29 16.2892C11.66 15.9192 12.34 15.9192 12.71 16.2892C12.8 16.3792 12.87 16.4892 12.92 16.6192C12.97 16.7392 13 16.8692 13 16.9992C13 17.2592 12.89 17.5192 12.71 17.7092C12.52 17.8892 12.26 17.9992 12 17.9992Z"
        fill="currentColor"
      />
      <path
        d="M15.5 18.0009C15.24 18.0009 14.98 17.8909 14.79 17.7109C14.7 17.6209 14.63 17.5109 14.58 17.3809C14.53 17.2609 14.5 17.1309 14.5 17.0009C14.5 16.8709 14.53 16.7409 14.58 16.6209C14.63 16.4909 14.7 16.3809 14.79 16.2909C15.02 16.0609 15.37 15.9509 15.69 16.0209C15.76 16.0309 15.82 16.0509 15.88 16.0809C15.94 16.1009 16 16.1309 16.06 16.1709C16.11 16.2009 16.16 16.2509 16.21 16.2909C16.39 16.4809 16.5 16.7409 16.5 17.0009C16.5 17.2609 16.39 17.5209 16.21 17.7109C16.02 17.8909 15.76 18.0009 15.5 18.0009Z"
        fill="currentColor"
      />
      <path
        d="M20.5 9.83984H3.5C3.09 9.83984 2.75 9.49984 2.75 9.08984C2.75 8.67984 3.09 8.33984 3.5 8.33984H20.5C20.91 8.33984 21.25 8.67984 21.25 9.08984C21.25 9.49984 20.91 9.83984 20.5 9.83984Z"
        fill="currentColor"
      />
      <path
        d="M16 22.75H8C4.35 22.75 2.25 20.65 2.25 17V8.5C2.25 4.85 4.35 2.75 8 2.75H16C19.65 2.75 21.75 4.85 21.75 8.5V17C21.75 20.65 19.65 22.75 16 22.75ZM8 4.25C5.14 4.25 3.75 5.64 3.75 8.5V17C3.75 19.86 5.14 21.25 8 21.25H16C18.86 21.25 20.25 19.86 20.25 17V8.5C20.25 5.64 18.86 4.25 16 4.25H8Z"
        fill="currentColor"
      />
    </svg>
  ),
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z"
        fill="currentColor"
      />
      <path
        d="M15.7106 15.9317C15.5806 15.9317 15.4506 15.9017 15.3306 15.8217L12.2306 13.9717C11.4606 13.5117 10.8906 12.5017 10.8906 11.6117V7.51172C10.8906 7.10172 11.2306 6.76172 11.6406 6.76172C12.0506 6.76172 12.3906 7.10172 12.3906 7.51172V11.6117C12.3906 11.9717 12.6906 12.5017 13.0006 12.6817L16.1006 14.5317C16.4606 14.7417 16.5706 15.2017 16.3606 15.5617C16.2106 15.8017 15.9606 15.9317 15.7106 15.9317Z"
        fill="currentColor"
      />
    </svg>
  ),
};

export const EditListForm = ({ list, onCancel, onSuccess }) => {
  const user = useSelector((state) => state.main.user);
  const dispatch = useDispatch();

  const [isPublic, setIsPublic] = useState(list ? list.public : false);

  const [name, handleNameChange] = useInputUsername(usernameMaxLength, list ? list.name : '');
  const [nameError, setNameError] = useState(null);
  const handleNameBlur = async () => {
    if (list && list.name === name) {
      setNameError(null);
      return;
    }
    try {
      const res = await mfetch(`/api/users/${user.username}/lists/${name}`);
      if (!res.ok) {
        if (res.status === 404) {
          setNameError(null);
          return;
        }
        throw new APIError(res.status, await res.json());
      }
      setNameError(`List with name ${name} already exists.`);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const [displayName, setDisplayName] = useState(list ? list.displayName : '');
  const [description, setDescription] = useState(list ? list.description : '');

  const createNewList = async () => {
    const newLists = await mfetchjson(`/api/users/${user.username}/lists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        displayName,
        description,
        public: isPublic,
      }),
    });
    dispatch(listsAdded(newLists));
  };

  const history = useHistory();
  const updateList = async () => {
    const newList = await mfetchjson(`/api/lists/${list.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        displayName,
        description,
        public: isPublic,
      }),
    });
    const res = await mfetchjson('/api/_initial');
    dispatch(listsAdded(res.lists));
    history.replace(`/@${list.username}/lists/${name}`);
    dispatch(listAdded(list.username, newList));
  };

  const [formDisabled, setFormDisabled] = useState(false);
  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
    }
    if (formDisabled) {
      return;
    }
    if (name === '') {
      setNameError('Name cannot be empty.');
      return;
    }
    setFormDisabled(true);
    try {
      if (list) {
        await updateList();
      } else {
        await createNewList();
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
    setFormDisabled(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <form className="modal-card-content" onSubmit={handleSubmit}>
        <div className="edit-list-modal-form" onSubmit={handleSubmit}>
          <InputWithCount
            label="Name"
            maxLength={usernameMaxLength}
            description="Name will be part of the URL of the list."
            error={nameError}
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            autoFocus
            style={{ marginBottom: 0 }}
            autoComplete="name"
          />
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div className="checkbox is-check-last">
            <label htmlFor="pub">Public</label>
            <input
              className="switch"
              type="checkbox"
              id="pub"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
          </div>
          <div className="input-with-label">
            <div className="input-label-box">
              <div className="label">Description</div>
            </div>
            <textarea
              rows="5"
              placeholder=""
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </form>
      <div className="modal-card-actions">
        <button className="button-main" onClick={handleSubmit} disabled={formDisabled}>
          {list ? 'Save' : 'Create'}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
};

EditListForm.propTypes = {
  list: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
