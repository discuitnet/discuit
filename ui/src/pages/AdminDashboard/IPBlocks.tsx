import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button, { ButtonClose } from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { mfetch, mfetchjson } from '../../helper';
import { IPBlock } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';

interface IPBlocksResultSet {
  blocks: IPBlock[];
  next: string | null;
}

export default function IPBlocks() {
  const [blocks, setBlocks] = useState<IPBlock[]>([]);

  const dispatch = useDispatch();
  useEffect(() => {
    const f = async () => {
      try {
        const res = (await mfetchjson('/api/ipblocks')) as IPBlocksResultSet;
        setBlocks(res.blocks);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    };
    f();
  }, [dispatch]);

  const handleRenderHead = () => {
    return (
      <TableRow columns={10} head>
        <div className="table-column">ID</div>
        <div className="table-column">Address</div>
        <div className="table-column">Created at</div>
        <div className="table-column">Created by</div>
        <div className="table-column">Expires at</div>
        <div className="table-column">Cancelled at</div>
        <div className="table-column">In effect</div>
        <div className="table-column">Associated users</div>
        <div className="table-column">Note</div>
        <div className="table-column"></div>
      </TableRow>
    );
  };

  const handleCancel = async (block: IPBlock) => {
    if (!confirm('Are you sure?')) {
      return;
    }
    try {
      const newBlock = (await mfetchjson(`/api/ipblocks/${block.id}`, {
        method: 'DELETE',
      })) as IPBlock;
      setBlocks((blocks) => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === block.id) {
            blocks[i] = {
              ...newBlock,
            };
          }
        }
        return [...blocks];
      });
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleRenderItem = (block: IPBlock) => {
    let associatedUsersText = '';
    for (let i = 0; i < block.associatedUsers.length; i++) {
      associatedUsersText += `${i > 0 ? ', ' : ''}${block.associatedUsers[i]}`;
    }
    return (
      <TableRow columns={10}>
        <div className="table-column">{block.id}</div>
        <div className="table-column">{printIP(block.ip, block.maskedBits)}</div>
        <div className="table-column">{new Date(block.createdAt).toLocaleString()}</div>
        <div className="table-column">@{block.createdBy}</div>
        <div className="table-column">
          {block.expiresAt ? new Date(block.expiresAt).toLocaleString() : ''}
        </div>
        <div className="table-column">
          {block.cancelledAt ? new Date(block.cancelledAt).toLocaleString() : ''}
        </div>
        <div className="table-column">{block.inEffect === true ? 'Yes' : '-'}</div>
        <div className="table-column">{associatedUsersText}</div>
        <div className="table-column">{block.note}</div>
        <div className="table-column">
          {block.inEffect && <Button onClick={() => handleCancel(block)}>Cancel</Button>}
        </div>
      </TableRow>
    );
  };

  const feedItems: SimpleFeedItem<IPBlock>[] = [];
  blocks.forEach((block) => feedItems.push({ item: block, key: block.id.toString() }));

  return (
    <div className="dashboard-page-ipblocks document">
      <div className="dashboard-page-title">
        <div>IP Blocks</div>
        <NewButton />
      </div>
      <div className="bashboard-page-content">
        <SimpleFeed
          className="table"
          items={feedItems}
          onRenderItem={handleRenderItem}
          onRenderHead={handleRenderHead}
        />
      </div>
    </div>
  );
}

interface NewBlockRequestBody {
  address: string;
  expiresAt: string | null;
  note: string;
}

function printIP(ip: string, maskedBits: number): string {
  if (maskedBits === 0) {
    return ip;
  }
  return `${ip}/${maskedBits}`;
}

function NewButton() {
  const [open, setOpen] = useState(false);
  const [ip, setIP] = useState('');

  const handleClose = () => {
    setOpen(false);
    setIP('');
  };

  const dispatch = useDispatch();
  const handleBlock = async () => {
    try {
      const body: NewBlockRequestBody = {
        address: ip,
        expiresAt: null,
        note: '',
      };
      const res = await mfetch('/api/ipblocks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error('error blocking ip: ' + ip);
      }
      const block = (await res.json()) as IPBlock;
      console.log(block);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <>
      <Button color="main" onClick={() => setOpen(true)}>
        New
      </Button>
      <Modal open={open} onClose={handleClose}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">Block IP</div>
            <ButtonClose onClick={handleClose} />
          </div>
          <div className="modal-card-content">
            <Input value={ip} onChange={(e) => setIP(e.target.value)} />
          </div>
          <div className="modal-card-actions">
            <Button color="main" onClick={handleBlock}>
              Block
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
