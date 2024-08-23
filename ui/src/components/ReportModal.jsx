import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { APIError, mfetch } from '../helper';
import { snackAlert, snackAlertError } from '../slices/mainSlice';
import { ButtonClose } from './Button';
import Modal from './Modal';

const ReportModal = ({
  target,
  targetType,
  buttonClassName = 'button-text',
  disabled = false,
  noButton,
  open: outerOpen = null,
  onClose,
}) => {
  const dispatch = useDispatch();
  const reasons = useSelector((state) => state.main.reportReasons);
  const [selected, setSelected] = useState(null);

  const [innerOpen, setInnerOpen] = useState(false);
  const open = outerOpen ?? innerOpen;

  const handleClose = onClose ?? (() => setInnerOpen(false));
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const handleRadioChange = (e) => {
    setSelected(e.target.value);
  };

  const handleReport = async () => {
    if (selected !== null) {
      try {
        const res = await mfetch('/api/_report', {
          method: 'POST',
          body: JSON.stringify({
            targetId: target.id,
            type: targetType,
            reason: parseInt(selected),
          }),
        });
        if (!res.ok) {
          if (res.status === 409) {
            dispatch(snackAlert('You have already reported this ' + targetType));
            return;
          } else {
            throw new APIError(res.status, await res.json());
          }
        }
        dispatch(snackAlert(`${targetType[0].toUpperCase() + targetType.slice(1)} reported.`));
      } catch (error) {
        dispatch(snackAlertError(error));
      } finally {
        setInnerOpen(false);
      }
    }
  };

  return (
    <>
      {noButton ? null : (
        <button className={buttonClassName} onClick={() => setInnerOpen(true)} disabled={disabled}>
          Report
        </button>
      )}
      <Modal open={open} onClose={handleClose}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">Report {targetType}</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="modal-card-content">
            <div
              className="flex flex-column"
              onChange={handleRadioChange}
              style={{ minWidth: '340px' }}
            >
              {reasons.map((r) => (
                <div key={r.id} className="radio" style={{ margin: '0.7rem 0' }}>
                  <input id={'report-reason' + r.id} type="radio" name="reason" value={r.id} />
                  <label htmlFor={'report-reason' + r.id}>{r.title}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-card-actions">
            <button className="button-main" onClick={handleReport} disabled={selected === null}>
              Report
            </button>
            <button onClick={handleClose}>Cancel</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

ReportModal.propTypes = {
  target: PropTypes.object.isRequired,
  targetType: PropTypes.string.isRequired,
  noButton: PropTypes.bool,
  buttonClassName: PropTypes.string,
  disabled: PropTypes.bool,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export default ReportModal;
