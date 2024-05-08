import React, { useState } from 'react';
import Modal from './Modal';
import { ButtonClose } from './Button';
import Input from './Input';

const items = {
  Favorites: true,
  'Read Later': false,
  Cute: false,
  Adorable: false,
};

const SaveToListModal = () => {
  const [open, setOpen] = useState(true);
  const handleClose = () => setOpen(false);

  const [page, setPage] = useState('list'); // One of: list, new.

  const renderListPage = () => {
    const renderList = () => {
      const renderItem = (name, checked) => {
        const htmlFor = `ch-${name}`;
        return (
          <div className="list-item" key={name}>
            <label htmlFor={htmlFor}>{name}</label>
            <input
              className="checkbox"
              id={htmlFor}
              type="checkbox"
              checked={checked}
              onChange={null}
            />
          </div>
        );
      };
      const elements = [];
      for (const [key, value] of Object.entries(items)) {
        elements.push(renderItem(key, value));
      }
      return <>{elements}</>;
    };
    return (
      <>
        <div className="modal-card-content">
          <div className="save-modal-list is-custom-scrollbar is-v2">{renderList()}</div>
        </div>
        <div className="modal-card-actions">
          <button onClick={() => setPage('new')}>Create new list</button>
        </div>
      </>
    );
  };

  const [canCreateList, setCanCreateList] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [newListPublicStatus, setNewListPublicStatus] = useState(false);
  const handleCreateNewList = async () => {
    try {
      setCanCreateList(false);
    } catch (error) {
    } finally {
      setCanCreateList(true);
      setNewListName('');
      setNewListPublicStatus(false);
      setPage('list');
    }
  };

  const renderNewPage = () => {
    return (
      <>
        <div className="modal-card-content">
          <div className="save-modal-newlist">
            <Input
              label="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
            />
            <div className="checkbox is-check-last">
              <label htmlFor="pub">Public</label>
              <input
                className="switch"
                type="checkbox"
                id="pub"
                checked={newListPublicStatus}
                onChange={(e) => setNewListPublicStatus(e.target.checked)}
              />
            </div>
          </div>
        </div>
        <div className="modal-card-actions">
          <button className="button-main" onClick={handleCreateNewList} disabled={!canCreateList}>
            Create
          </button>
          <button onClick={() => setPage('list')}>Cancel</button>
        </div>
      </>
    );
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div
        className={
          'modal-card save-modal is-compact-mobile' +
          (page === 'new' ? ' is-page-new' : '') +
          (page === 'list' ? ' is-page-list' : '')
        }
      >
        <div className="modal-card-head">
          <div className="modal-card-title">
            {page === 'list' && 'Save to'}
            {page === 'new' && 'Create list'}
          </div>
          <ButtonClose onClick={handleClose} />
        </div>
        {page === 'list' && renderListPage()}
        {page === 'new' && renderNewPage()}
      </div>
    </Modal>
  );
};

export default SaveToListModal;
