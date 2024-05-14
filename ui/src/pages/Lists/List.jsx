import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import MiniFooter from '../../components/MiniFooter';
import { Helmet } from 'react-helmet-async';
import Link from '../../components/Link';
import Modal from '../../components/Modal';
import { ButtonClose } from '../../components/Button';
import Input from '../../components/Input';
import { stringCount } from '../../helper';
import PostsFeed from '../../views/PostsFeed';

const List = () => {
  const { username, listName } = useParams();

  const [editModalOpen, setEditModalOpen] = useState(false);

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
            <h1 className="list-head-name">Favorites</h1>
            <Link to="/@previnder" className="list-head-user">
              @previnder
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
          <PostsFeed feedType="all" />
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
