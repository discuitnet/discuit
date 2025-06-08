import { useState } from 'react';
import { ButtonClose } from '../../components/Button';
import Modal from '../../components/Modal';
import { Badge as BadgeType, User } from '../../serverTypes';
import Badge from './Badge';

function BadgesList({ user }: { user: User }) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const handleModalClose = () => setModalOpen(false);

  const handleBadgeClick = (badge: BadgeType) => {
    setSelectedBadge(badge);
    setModalOpen(true);
  };

  let modalTitle, modalDesc;
  if (selectedBadge) {
    switch (selectedBadge.type) {
      case 'supporter':
        modalTitle = 'Supporter';
        modalDesc = 'This user is a Patreon supporter, helping to keep Discuit always free of ads.';
        break;
      default:
        throw new Error(`unkown badge type '${selectedBadge.type}'`);
    }
  }

  const badges = user.badges || [];

  return (
    <div className="user-badges">
      <Modal open={modalOpen} onClose={handleModalClose}>
        <div className="modal-card is-compact-mobile is-center modal-badges">
          <div className="modal-badges-head">
            <ButtonClose className="modal-badges-close" onClick={handleModalClose} />
            {selectedBadge && <Badge badge={selectedBadge} />}
          </div>
          <div className="modal-badges-body">
            <div className="modal-badges-title">{modalTitle}</div>
            <div className="modal-badges-desc">{modalDesc}</div>
          </div>
        </div>
      </Modal>
      <div className="user-badges-items">
        {badges.map((badge) => (
          <Badge key={badge.id} badge={badge} onClick={() => handleBadgeClick(badge)} />
        ))}
      </div>
    </div>
  );
}

export default BadgesList;
