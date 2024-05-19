import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import MiniFooter from '../../components/MiniFooter';
import { Helmet } from 'react-helmet-async';
import Link from '../../components/Link';
import Modal from '../../components/Modal';
import { ButtonClose } from '../../components/Button';
import Input from '../../components/Input';
import { mfetch, mfetchjson, stringCount } from '../../helper';
import { useDispatch, useSelector } from 'react-redux';
import { snackAlertError } from '../../slices/mainSlice';
import {
  FeedItem,
  feedInViewItemsUpdated,
  feedItemHeightChanged,
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

const List = () => {
  const dispatch = useDispatch();
  const { username, listName } = useParams();

  const [editModalOpen, setEditModalOpen] = useState(false);

  const list = useSelector(selectList(username, listName));
  const [listLoading, setListLoading] = useState(list ? 'loaded' : 'loading');

  const listEndpoint = `/api/users/${username}/lists/${listName}`;
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
    setListLoading('loading');
  }, [username, listName]);

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
        const res = await mfetchjson(feedEndpoint);
        setFeed(res);
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
      const res = await mfetchjson(`${feedEndpoint}&next=${feed.next}`);
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

  if (feedLoading || feedLoadingError || listLoading !== 'loaded' || !list) {
    if (listLoading === 'notfound') {
      return <NotFound />;
    }
    return <PageLoading />;
  }

  return (
    <div className="page-content wrap page-grid page-list">
      <EditListModal open={editModalOpen} onClose={() => setEditModalOpen(false)} />
      <Helmet>
        <title>{`${listName} of @${username}`}</title>
      </Helmet>
      <Sidebar />
      <main className="page-middle">
        <header className="card card-padding list-head">
          <div className="list-head-main">
            <h1 className="list-head-name">{list.displayName}</h1>
            <Link to="/@previnder" className="list-head-user">
              @{list.username}
            </Link>
            <div className="list-head-desc">
              Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aperiam, magni?
            </div>
          </div>
          <div className="list-head-actions">
            <button onClick={() => setEditModalOpen(true)}>Edit list</button>
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
              <div>{stringCount(125, false, 'total item')}</div>
            </div>
            <div className="card-list-item">
              {SVGs.comment}
              <div>{stringCount(100, false, 'post')}</div>
            </div>
            <div className="card-list-item">
              {SVGs.comment}
              <div>{stringCount(25, false, 'comment')}</div>
            </div>
            <div className="card-list-item">
              {SVGs.comment}
              <div>Created on 10 October 2024</div>
            </div>
            <div className="card-list-item">
              {SVGs.comment}
              <div>Last updated two weeks ago</div>
            </div>
          </div>
        </div>
        <MiniFooter />
      </aside>
    </div>
  );
};

export default List;

const EditListModal = ({ open, onClose }) => {
  const [listname, setListname] = useState('Favorites');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card edit-list-modal is-compact-mobile">
        <div className="modal-card-head">
          <div className="modal-card-title">Edit list</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">
          <Input
            label="List name"
            value={listname}
            onChange={(e) => setListname(e.target.value)}
            autoFocus
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
        <div className="modal-card-actions">
          <button className="button-main" onClick={null}>
            Save
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

EditListModal.propTypes = {
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
