import React, { useState } from 'react';
import Modal from './Modal';
import { ButtonClose } from './Button';

const items = {
  Favorites: true,
  'Read Later': false,
  Cute: false,
  Adorable: false,
};

const SaveToListModal = () => {
  const [open, setOpen] = useState(true);
  const handleClose = () => setOpen(false);

  const renderList = () => {
    const elements = [];
    for (const [key, value] of Object.entries(items)) {
      elements.push(renderListItem(key, value));
    }
    return <>{elements}</>;
  };

  const renderListItem = (name, checked) => {
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

  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const createNewList = () => {
    setCreatingList(false);
  };
  const renderCreateListButton = () => {
    if (creatingList) {
      return (
        <div className="save-modal-new-list">
          <input
            type="text"
            placeholder="Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button className="button-main" onClick={createNewList}>
            Create
          </button>
        </div>
      );
    }
    return <button onClick={() => setCreatingList(true)}>Create new list</button>;
  };

  const showHint = false;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="modal-card save-modal">
        <div className="modal-card-head">
          <div className="modal-card-title">Save to</div>
          <ButtonClose onClick={handleClose} />
        </div>
        <div className="modal-card-content">
          <div className="save-modal-list is-custom-scrollbar is-v2">{renderList()}</div>
          {showHint && <div className="save-modal-hint">Enter to save to Favourites.</div>}
        </div>
        <div className="modal-card-actions">{renderCreateListButton()}</div>
      </div>
    </Modal>
  );
};

export default SaveToListModal;
