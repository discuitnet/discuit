import Button, { ButtonClose } from '../../components/Button';
import Modal from '../../components/Modal';
import { dateString1, timeAgo } from '../../helper';
import { User } from '../../serverTypes';

export default function UserAdminsViewModal({
  user,
  open,
  onClose,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
}) {
  const renderTable = () => {
    if (!user) alert('oh oh');

    const skipFields = ['proPic', 'moddingList'];
    const rows: React.ReactNode[] = [];

    for (const [key, value] of Object.entries(user)) {
      if (skipFields.includes(key)) {
        continue;
      }

      let valueText = '';
      if (key === 'createdAt') {
        valueText = dateString1(value);
      } else if (key === 'lastSeen') {
        valueText = timeAgo(value);
      } else {
        switch (typeof value) {
          case 'bigint':
          case 'number':
          case 'string':
            valueText = `${value}`;
            break;
          case 'boolean':
            valueText = value == true ? 'true' : 'false';
            break;
          default:
            valueText = JSON.stringify(value);
            break;
        }
      }

      const row = (
        <div className="table-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="table-column">{key}</div>
          <div className="table-column">{valueText}</div>
        </div>
      );
      rows.push(row);
    }

    return <div className="table">{rows}</div>;
  };

  if (!open) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-card modal-user-admins-view">
        <div className="modal-card-head">
          <div className="modal-card-title">User details</div>
          <ButtonClose onClick={onClose} />
        </div>
        <div className="modal-card-content">{renderTable()}</div>
        <div className="modal-card-actions">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
