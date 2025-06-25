import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button, { ButtonClose } from '../../components/Button';
import { Form, FormField } from '../../components/Form';
import Input from '../../components/Input';
import MarkdownTextarea from '../../components/MarkdownTextarea';
import Modal from '../../components/Modal';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { IPBlock } from '../../serverTypes';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';

interface IPBlocksResultSet {
  blocks: IPBlock[];
  next: string | null;
}

async function fetchIPBlocks(next?: string): Promise<IPBlocksResultSet> {
  let url = '/api/ipblocks';
  if (next) {
    url += `?next=${next}`;
  }
  return mfetchjson<IPBlocksResultSet>(url);
}

export default function IPBlocks() {
  const [blocks, setBlocks] = useState<IPBlock[]>([]);
  const [next, setNext] = useState<string | null>(null);

  const dispatch = useDispatch();
  useEffect(() => {
    const f = async () => {
      try {
        const res = await fetchIPBlocks();
        setBlocks(res.blocks);
        setNext(res.next);
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

  const handleFetchMore = async () => {
    try {
      const res = await fetchIPBlocks(next || undefined);
      setBlocks((blocks) => [...blocks, ...res.blocks]);
      setNext(res.next);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
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
          onFetchMore={handleFetchMore}
          hasMore={Boolean(next)}
        />
      </div>
    </div>
  );
}

interface NewBlockRequestBody {
  address: string;
  expiresIn: number;
  note: string;
}

function printIP(ip: string, maskedBits: number): string {
  if (maskedBits === 0) {
    return ip;
  }
  return `${ip}/${maskedBits}`;
}

function wildCardToCIDR(str: string): string {
  str = str.trim();
  let nums: string[] = [];
  let isV4 = true;
  let len = 32;
  if (str.includes('.')) {
    nums = str.split('.'); // IPv4
  } else {
    isV4 = false;
    len = 128;
    nums = str.split(':'); // IPv6
  }
  let n = 0;
  for (let i = 0; i < nums.length; i++) {
    if (n > 0 && nums[i] !== '*') {
      throw new Error('Invalid wildcard');
    }
    if (nums[i] === '*') {
      n++;
      nums[i] = '0';
    }
  }
  if (n > 0) {
    return `${nums.join(isV4 ? '.' : ':')}/${len - n * 8}`;
  }
  return str;
}

function NewButton() {
  const [open, setOpen] = useState(false);
  const [ip, setIP] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [note, setNote] = useState('');

  const handleClose = () => {
    setOpen(false);
    setIP('');
  };

  const dispatch = useDispatch();
  const handleBlock = async () => {
    try {
      let expiresInNum = 0;
      if (expiresIn !== '') {
        expiresInNum = parseFloat(expiresIn);
        if (isNaN(expiresInNum)) {
          throw new Error('Invalid expires in value');
        }
      }
      const body: NewBlockRequestBody = {
        address: wildCardToCIDR(ip),
        expiresIn: expiresInNum,
        note,
      };
      const res = await mfetch('/api/ipblocks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error('Error blocking IP: ' + ((await res.json()) as APIError).message);
      }
    } catch (error) {
      dispatch(snackAlert((error as Error).message));
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
          <Form className="modal-card-content">
            <FormField
              label="IP address"
              description="The IP address could be a full IP address (eg: 10.0.0.1), a CIDR subnet (eg: 10.0.0.0/24), or a wildcard (eg: 10.0.*.*)."
            >
              <Input value={ip} onChange={(e) => setIP(e.target.value)} />
            </FormField>
            <FormField
              label="Expires in (optional)"
              description="Number of hours the IP block will be valid for. If this field is empty, the block will be valid indefinitely."
            >
              <Input value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} />
            </FormField>
            <FormField label="Note (optional)">
              <MarkdownTextarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} />
            </FormField>
          </Form>
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
