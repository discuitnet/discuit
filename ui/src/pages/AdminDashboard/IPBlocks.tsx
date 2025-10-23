import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button, { ButtonClose } from '../../components/Button';
import { Form, FormField } from '../../components/Form';
import Input, { Checkbox } from '../../components/Input';
import Link from '../../components/Link';
import MarkdownTextarea from '../../components/MarkdownTextarea';
import Modal from '../../components/Modal';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { TableRow } from '../../components/Table';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { IPBlock, SiteSettings } from '../../serverTypes';
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
  const [torBlocked, setTorblocked] = useState(false);
  const [blocks, setBlocks] = useState<IPBlock[]>([]);
  const [next, setNext] = useState<string | null>(null);

  const [loading, setLoading] = useLoading();
  const dispatch = useDispatch();
  useEffect(() => {
    const f = async () => {
      try {
        const torBlocked =
          ((await mfetchjson('/api/site_settings')) as SiteSettings).torBlocked || false;
        setTorblocked(torBlocked);
        const res = await fetchIPBlocks();
        setBlocks(res.blocks);
        setNext(res.next);
        setLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setLoading('error');
      }
    };
    f();
  }, [dispatch, loading]);

  const torBlockChangeInProgress = useRef(false);
  const handleTorBlockedOnChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (torBlockChangeInProgress.current) {
      return;
    }
    const checked = event.target.checked;
    try {
      torBlockChangeInProgress.current = true;
      setTorblocked(checked);
      await mfetchjson('/api/site_settings', {
        method: 'PUT',
        body: JSON.stringify({
          torBlocked: checked,
        }),
      });
    } catch (error) {
      setTorblocked(!checked);
      dispatch(snackAlertError(error));
    } finally {
      torBlockChangeInProgress.current = false;
    }
  };

  const renderID = false;

  const handleRenderHead = () => {
    return (
      <TableRow columns={9 + (renderID ? 1 : 0)} head>
        {renderID && <div className="table-column">ID</div>}
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

  const [usersList, setUsersList] = useState<string[]>([]);
  const [usersListModalOpen, setUsersListModalOpen] = useState(false);
  const closeUsersListModal = () => setUsersListModalOpen(false);
  const openUsersListModal = (usernames: string[]) => {
    setUsersList(usernames);
    setUsersListModalOpen(true);
  };

  const handleRenderItem = (block: IPBlock) => {
    const users: React.ReactNode[] = [],
      limit = 10;
    for (let i = 0; i < Math.min(block.associatedUsers.length, limit); i++) {
      const username = block.associatedUsers[i];
      users.push(
        <Link to={`/@${username}`} key={username}>
          @{username}
        </Link>
      );
    }
    if (block.associatedUsers.length > limit) {
      users.push(
        <div
          onClick={() => openUsersListModal(block.associatedUsers)}
          style={{ cursor: 'pointer' }}
        >
          and {block.associatedUsers.length - limit} more
        </div>
      );
    }

    // let associatedUsersText = '';
    // for (let i = 0; i < block.associatedUsers.length; i++) {
    //   associatedUsersText += `${i > 0 ? ', ' : ''}${block.associatedUsers[i]}`;
    // }
    return (
      <TableRow columns={9 + (renderID ? 1 : 0)}>
        {renderID && <div className="table-column">{block.id}</div>}
        <div className="table-column">{printIP(block.ip, block.maskedBits)}</div>
        <div className="table-column">{new Date(block.createdAt).toLocaleString()}</div>
        <div className="table-column">
          <Link to={`/@${block.createdBy}`}>@{block.createdBy}</Link>
        </div>
        <div className="table-column">
          {block.expiresAt ? new Date(block.expiresAt).toLocaleString() : ''}
        </div>
        <div className="table-column">
          {block.cancelledAt ? new Date(block.cancelledAt).toLocaleString() : ''}
        </div>
        <div className="table-column">{block.inEffect === true ? 'Yes' : '-'}</div>
        <div className="table-column table-column-usernames">{users}</div>
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

  const handleNewBlockAdded = (block: IPBlock) => {
    setBlocks((blocks) => [block, ...blocks]);
  };

  const feedItems: SimpleFeedItem<IPBlock>[] = [];
  blocks.forEach((block) => feedItems.push({ item: block, key: block.id.toString() }));

  return (
    <div className="dashboard-page-ipblocks document">
      <Modal open={usersListModalOpen} onClose={closeUsersListModal}>
        <div className="modal-card modal-users-list">
          <div className="modal-card-head">
            <div className="modal-card-title">Associated users</div>
            <ButtonClose onClick={closeUsersListModal} />
          </div>
          <div className="modal-card-content">
            {usersList.map((username) => (
              <Link to={`/@${username}`} key={username}>
                @{username}
              </Link>
            ))}
          </div>
          <div className="modal-card-actions">
            <Button>Close</Button>
          </div>
        </div>
      </Modal>
      <div className="dashboard-page-title">
        <div>IP Blocks</div>
        <div className="right">
          {loading === 'loaded' && (
            <FormField>
              <Checkbox
                variant="switch"
                label="Tor block"
                checked={torBlocked}
                onChange={handleTorBlockedOnChange}
              />
            </FormField>
          )}
          <NewButton onSuccess={handleNewBlockAdded} />
        </div>
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

function NewButton({ onSuccess }: { onSuccess: (block: IPBlock) => void }) {
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
      const block = (await res.json()) as IPBlock;
      onSuccess(block);
      handleClose();
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
