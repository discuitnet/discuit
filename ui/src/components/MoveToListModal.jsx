import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import { ButtonClose } from './Button';
import { useDispatch, useSelector } from 'react-redux';
import {
  listsAdded,
  moveToListModalClosed,
  snackAlert,
  snackAlertError,
} from '../slices/mainSlice';
import { mfetchjson } from '../helper';
import { EditListForm } from '../pages/Lists/List';

const MoveToListModal = () => {
  const dispatch = useDispatch();
  const { open, toMoveItemId, toMoveItemType, toMoveListId } = useSelector((state) => state.main.moveToListModal);
  const handleClose = () => dispatch(moveToListModalClosed());

  if (open) {
    return (
      <TheModal
        open={open}
        onClose={handleClose}
        toMoveItemId={toMoveItemId}
        toMoveItemType={toMoveItemType}
        toMoveListId={toMoveListId}
      />
    );
  }

  return null;
};

const TheModal = ({ open, onClose, toMoveItemId, toMoveItemType, toMoveListId }) => {
  const handleClose = onClose;

  const dispatch = useDispatch();

  const [page, setPage] = useState('list');

  const lists = useSelector((state) => state.main.lists.lists);

  const handleItemClick = async (list) => {
    try {
      await mfetchjson(`/api/lists/${list.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          targetId: toMoveItemId,
          targetType: toMoveItemType,
        }),
      });

      await mfetchjson(`/api/lists/${toMoveListId}/items`, {
        method: 'DELETE',
        body: JSON.stringify({
          targetId: toMoveItemId,
          targetType: toMoveItemType,
        }),
      });

      const alertText = `Moved to ${list.name}`;
      dispatch(snackAlert(alertText, `move_listitem_${list.name}_${toMoveItemId}`));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const renderListPage = () => {
    const renderList = () => {
      const renderItem = (list) => {
        if (list.id === toMoveListId) {
          return null;
        }

        const { name, displayName } = list;
        return (
          <div className="list-item" key={name}>
            <button className="button-text" onClick={() => handleItemClick(list)} style={{ width: '100%' }}>
              {displayName}
            </button>
          </div>
        );
      };
      const elements = lists.map((list) => renderItem(list));
      return <>{elements}</>;
    };
    return (
      <>
        <div className="modal-card-content">
          <div className="move-modal-list is-custom-scrollbar is-v2">{renderList()}</div>
        </div>
        <div className="modal-card-actions">
          <button onClick={() => setPage('new')}>Create new list</button>
        </div>
      </>
    );
  };
  const renderNewPage = () => {
    const switchTab = () => setPage('list');
    return <EditListForm onCancel={switchTab} onSuccess={switchTab} />;
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
            {page === 'list' && 'Move to'}
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

TheModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  toMoveItemId: PropTypes.string.isRequired,
  listId: PropTypes.string.isRequired,
  toMoveItemType: PropTypes.string.isRequired,
};

export default MoveToListModal;
