import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { APIError, mfetch } from '../helper';
import { MainState, snackAlert, snackAlertError } from '../slices/mainSlice';
import { RootState } from '../store';
import { ButtonClose } from './Button';
import Modal from './Modal';

export interface ReportModalProps {
  target: { id: unknown } & unknown;
  targetType: string;
  noButton?: boolean;
  buttonClassName?: string;
  disabled?: boolean;
  open?: boolean;
  onClose?: () => void;
}

const ReportModal = ({
  target,
  targetType,
  buttonClassName = 'button-text',
  disabled = false,
  noButton,
  open: outerOpen,
  onClose,
}: ReportModalProps) => {
  const dispatch = useDispatch();
  const reasons = useSelector<RootState>(
    (state) => state.main.reportReasons
  ) as MainState['reportReasons'];
  const [selected, setSelected] = useState<string | null>(null);

  const [innerOpen, setInnerOpen] = useState(false);
  const open = outerOpen ?? innerOpen;

  const handleClose = onClose ?? (() => setInnerOpen(false));
  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.value);
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
            dispatch(
              snackAlert(`You have already reported this ${targetType}`, `report_${targetType}`)
            );
            return;
          } else {
            throw new APIError(res.status, await res.json());
          }
        }
        dispatch(
          snackAlert(
            `${targetType[0].toUpperCase() + targetType.slice(1)} reported.`,
            `reported_${targetType}`
          )
        );
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
              {(reasons || []).map((reason) => (
                <div key={reason.id} className="radio" style={{ margin: '0.7rem 0' }}>
                  <input
                    id={'report-reason' + reason.id}
                    type="radio"
                    name="reason"
                    value={reason.id}
                  />
                  <label htmlFor={'report-reason' + reason.id}>{reason.title}</label>
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

export default ReportModal;
