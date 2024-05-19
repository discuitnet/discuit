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
            <Link to="/@previnder" className="list-head-user">
              @{list.username}
            </Link>
            <div className="list-head-desc">{list.description}</div>
          </div>
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
              {SVGs.comment}
              <div>{`Created on ${dateString1(list.createdAt)}`}</div>
            </div>
            <div className="card-list-item">
              {SVGs.comment}
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
