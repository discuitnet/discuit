import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import { ButtonClose } from './Button';
import Input from './Input';
import { useDispatch, useSelector } from 'react-redux';
import { listsAdded, saveToListModalClosed, snackAlertError } from '../slices/mainSlice';
import { mfetchjson } from '../helper';
import { EditListForm } from '../pages/Lists/List';

const SaveToListModal = () => {
  const dispatch = useDispatch();
  const { open, toSaveItemId, toSaveItemType } = useSelector((state) => state.main.saveToListModal);
  const handleClose = () => dispatch(saveToListModalClosed());

  if (open) {
    return (
      <TheModal
        open={open}
        onClose={handleClose}
        toSaveItemId={toSaveItemId}
        toSaveItemType={toSaveItemType}
      />
    );
  }

  return null;
};

const TheModal = ({ open, onClose, toSaveItemId, toSaveItemType }) => {
  const handleClose = onClose;

  const dispatch = useDispatch();

  const user = useSelector((state) => state.main.user);
  const [page, setPage] = useState('list'); // One of: list, new.

  const [prevCheckedLists, setPrevCheckedLists] = useState(null); // List of list ids.
  useEffect(() => {
    const f = async () => {
      try {
        const ids = await mfetchjson(
          `/api/lists/_saved_to?id=${toSaveItemId}&type=${toSaveItemType}`
        );
        setPrevCheckedLists(ids);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    };
    f();
  }, [toSaveItemId, toSaveItemType]);

  const lists = useSelector((state) => state.main.lists.lists);
  const [listState, setListState] = useState({});
  const listsLoading = lists && listState && lists.length !== Object.keys(listState).length;
  useEffect(() => {
    if (prevCheckedLists === null) {
      return;
    }
    setListState((prev) => {
      const newState = {
        ...prev,
      };
      for (const list of lists) {
        if (!prev[list.id]) {
          newState[list.id] = {
            checked: Boolean(prevCheckedLists.find((v) => v === list.id)),
            requestInProgress: false,
          };
        }
      }
      return newState;
    });
  }, [lists, prevCheckedLists]);
  const setListItemState = (listId, state) => {
    setListState((prev) => {
      return {
        ...prev,
        [listId]: {
          ...prev[listId],
          ...state,
        },
      };
    });
  };
  const handleItemClick = async (list, event) => {
    const checked = event.target.checked;
    setListItemState(list.id, {
      checked,
      requestInProgress: true,
    });
    try {
      await mfetchjson(`/api/lists/${list.id}/items`, {
        method: checked ? 'POST' : 'DELETE',
        body: JSON.stringify({
          targetId: toSaveItemId,
          targetType: toSaveItemType,
        }),
      });
    } catch (error) {
      setListItemState(list.id, {
        checked: !checked,
      });
      dispatch(snackAlertError(error));
    } finally {
      setListItemState(list.id, { requestInProgress: false });
    }
  };
  const renderListPage = () => {
    if (listsLoading) {
      return (
        <>
          <div className="modal-card-content">
            <div className="skeleton">
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
            </div>
          </div>
        </>
      );
    }

    const renderList = () => {
      const renderItem = (list) => {
        const { name } = list;
        const htmlFor = `ch-${name}`;
        return (
          <div className="list-item" key={name}>
            <label htmlFor={htmlFor}>{name}</label>
            <input
              className="checkbox"
              id={htmlFor}
              type="checkbox"
              checked={listState[list.id].checked}
              disabled={listState[list.id].requestInProgress}
              onChange={(event) => handleItemClick(list, event)}
            />
          </div>
        );
      };
      const elements = lists.map((list) => renderItem(list));
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

TheModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  toSaveItemId: PropTypes.string.isRequired,
  toSaveItemType: PropTypes.string.isRequired,
};

export default SaveToListModal;
