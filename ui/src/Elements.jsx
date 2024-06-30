import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose, ButtonMore } from './components/Button';
import Dropdown from './components/Dropdown';
import { InputWithCount, useInputMaxLength } from './components/Input';
import Modal from './components/Modal';
import ModalConfirm from './components/Modal/ModalConfirm';
import PostCardSkeleton from './components/PostCard/PostCardSkeleton';
import Spinner from './components/Spinner';
import { snackAlert } from './slices/mainSlice';

const Elements = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [iwcValue, iwcHandleChange] = useInputMaxLength(1000);

  const [background, setBackground] = useState('#fff');
  const handleToggleBackground = () => {
    setBackground((b) => (b === '#fff' ? 'transparent' : '#fff'));
  };
  const style = {
    background,
  };

  return (
    <div className="test-elements wrap" style={style}>
      <button
        className="button-main"
        style={{ alignSelf: 'flex-end' }}
        onClick={handleToggleBackground}
      >
        Toggle background
      </button>
      <div
        style={{
          width: '100%',
          height: '100px',
          borderRadius: '3px',
          background: 'var(--color-brand)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
        }}
      >
        Theme color
      </div>
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <button>Open thing</button>
      <button className="button-main" onClick={() => setOpen(true)}>
        Open thing
      </button>
      <button className="button-red">Dangerous</button>
      <a href="https://www.google.com/" className="button">
        Link button
      </a>
      <a href="https://www.google.com/" className="button button-main">
        Link button
      </a>
      <button className="button-text">Text button</button>
      <button className="button-with-icon">
        <svg
          aria-hidden="true"
          focusable="false"
          data-prefix="far"
          data-icon="comments"
          className="svg-inline--fa fa-comments fa-w-18"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 576 512"
        >
          <path
            fill="currentColor"
            d="M532 386.2c27.5-27.1 44-61.1 44-98.2 0-80-76.5-146.1-176.2-157.9C368.3 72.5 294.3 32 208 32 93.1 32 0 103.6 0 192c0 37 16.5 71 44 98.2-15.3 30.7-37.3 54.5-37.7 54.9-6.3 6.7-8.1 16.5-4.4 25 3.6 8.5 12 14 21.2 14 53.5 0 96.7-20.2 125.2-38.8 9.2 2.1 18.7 3.7 28.4 4.9C208.1 407.6 281.8 448 368 448c20.8 0 40.8-2.4 59.8-6.8C456.3 459.7 499.4 480 553 480c9.2 0 17.5-5.5 21.2-14 3.6-8.5 1.9-18.3-4.4-25-.4-.3-22.5-24.1-37.8-54.8zm-392.8-92.3L122.1 305c-14.1 9.1-28.5 16.3-43.1 21.4 2.7-4.7 5.4-9.7 8-14.8l15.5-31.1L77.7 256C64.2 242.6 48 220.7 48 192c0-60.7 73.3-112 160-112s160 51.3 160 112-73.3 112-160 112c-16.5 0-33-1.9-49-5.6l-19.8-4.5zM498.3 352l-24.7 24.4 15.5 31.1c2.6 5.1 5.3 10.1 8 14.8-14.6-5.1-29-12.3-43.1-21.4l-17.1-11.1-19.9 4.6c-16 3.7-32.5 5.6-49 5.6-54 0-102.2-20.1-131.3-49.7C338 339.5 416 272.9 416 192c0-3.4-.4-6.7-.7-10C479.7 196.5 528 238.8 528 288c0 28.7-16.2 50.6-29.7 64z"
          ></path>
        </svg>
        <span>text</span>
      </button>
      <button className="button-text button-with-icon">
        <svg
          aria-hidden="true"
          focusable="false"
          data-prefix="far"
          data-icon="trash-alt"
          className="svg-inline--fa fa-trash-alt fa-w-14"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
        >
          <path
            fill="currentColor"
            d="M268 416h24a12 12 0 0 0 12-12V188a12 12 0 0 0-12-12h-24a12 12 0 0 0-12 12v216a12 12 0 0 0 12 12zM432 80h-82.41l-34-56.7A48 48 0 0 0 274.41 0H173.59a48 48 0 0 0-41.16 23.3L98.41 80H16A16 16 0 0 0 0 96v16a16 16 0 0 0 16 16h16v336a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128h16a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16zM171.84 50.91A6 6 0 0 1 177 48h94a6 6 0 0 1 5.15 2.91L293.61 80H154.39zM368 464H80V128h288zm-212-48h24a12 12 0 0 0 12-12V188a12 12 0 0 0-12-12h-24a12 12 0 0 0-12 12v216a12 12 0 0 0 12 12z"
          ></path>
        </svg>
        <span>text</span>
      </button>
      <button className="button-icon-simple">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
        </svg>
      </button>
      <div className="input-with-label">
        <div className="label">Name</div>
        <input type="text" />
      </div>
      <Dropdown target={<button>Dropdown</button>}>
        <div className="dropdown-list">
          <div className="dropdown-item">Item one</div>
          <div className="dropdown-item">Item two</div>
          <div className="dropdown-item">Item three</div>
          <div className="dropdown-item">Item four</div>
        </div>
      </Dropdown>
      <Dropdown target="Dropdown with the default target">
        <div className="dropdown-list">
          <div className="dropdown-item">Item one</div>
          <div className="dropdown-item">Item two</div>
          <div className="dropdown-item">Item three</div>
          <div className="dropdown-item">Item four</div>
        </div>
      </Dropdown>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus facere cupiditate,
        asperiores, quam, ullam id nobis est incidunt dolores velit cum saepe quia voluptatem.
        Obcaecati sunt in ipsam laudantium deleniti.
      </p>
      <p>
        Should this look more like a document or an app? Regardless, it should feel hella fast and
        responsive.
      </p>
      <a href="https://www.google.com/" target="_blank" rel="noreferrer">
        Go someplace else
      </a>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">What up</div>
            <ButtonClose onClick={() => setOpen(false)} />
          </div>
          <div className="modal-card-content">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore nulla amet aliquid
            quidem reiciendis et ad voluptates soluta dolorem, illum nesciunt ratione eaque deleniti
            doloribus illo quam ea? Nihil, dolorum?
          </div>
          <div className="modal-card-actions">
            <button className="button-main">Yes</button>
            <button>No</button>
          </div>
        </div>
      </Modal>
      <ButtonClose />
      <ButtonMore />
      <Dropdown target={<ButtonMore vertical />}>
        <div className="dropdown-list">
          <div className="dropdown-item">Item one</div>
          <div className="dropdown-item">Item two</div>
          <div className="dropdown-item is-topic">Topic</div>
          <div className="dropdown-item">Item three</div>
          <div className="dropdown-item">Item four</div>
        </div>
      </Dropdown>
      <button onClick={() => dispatch(snackAlert('same thing'))}>Snack Alert</button>
      <div className="input-with-label">
        <div className="label">About page</div>
        <div className="input-desc">Lorem ipsum dolor sit amet consectetur adipisicing elit.</div>
        <input type="text" />
      </div>
      <div className="input-with-label">
        <div className="label">Another input</div>
        <input type="text" />
        <div className="input-desc">Description underneath input.</div>
      </div>
      <div className="checkbox">
        <input id="c1" type="checkbox" />
        <label htmlFor="c1">Checkbox</label>
      </div>
      <div className="radio">
        <input id="r1" type="radio" name="radio" value="1" />
        <label htmlFor="r1">Radio</label>
      </div>
      <div className="checkbox">
        <input id="s1" type="checkbox" className="switch" />
        <label htmlFor="s1">Switch</label>
      </div>
      <input type="checkbox" className="switch" />
      <button onClick={() => setConfirmOpen(true)}>Open confirm modal</button>
      <ModalConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => alert('hurray')}
      >
        Wanna do this?
      </ModalConfirm>
      <div className="table">
        <div className="table-row table-head">
          <div className="table-column">Title</div>
          <div className="table-column">Second Title</div>
          <div className="table-column">Third Title</div>
        </div>
        <div className="table-row">
          <div className="table-column">Lorem</div>
          <div className="table-column">ipsum</div>
          <div className="table-column">XX</div>
        </div>
        <div className="table-row">
          <div className="table-column">Sleep</div>
          <div className="table-column">Bay</div>
          <div className="table-column">Sleep</div>
        </div>
        <div className="table-row">
          <div className="table-column">In</div>
          <div className="table-column">Sleep</div>
          <div className="table-column">May</div>
        </div>
        <div className="table-row">
          <div className="table-column">You</div>
          <div className="table-column">Slumber</div>
          <div className="table-column">Germans</div>
        </div>
      </div>
      <InputWithCount
        textarea={true}
        label="Couting"
        description="Has a max-length."
        maxLength={1000}
        value={iwcValue}
        onChange={iwcHandleChange}
      />
      <div className="pagination">
        <div className="left">
          <button className="pagination-item is-selected">1</button>
          <button className="pagination-item">2</button>
          <button className="pagination-item">3</button>
          <div className="pagination-item">...</div>
          <button className="pagination-item">4</button>
        </div>
        <div className="right">
          <button className="pagination-item">Previous</button>
          <button className="pagination-item">Next</button>
        </div>
      </div>
      <button className="button-hamburger">
        <div className="hamburger-lines">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </button>
      <Spinner />
      <p>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Aut quaerat aliquam voluptas esse
        maiores eaque quos earum, non hic saepe vitae molestiae nostrum! Dicta illum veniam eius
        culpa? Pariatur, harum!
      </p>
      <div style={{ width: '100%' }}>
        <PostCardSkeleton />
      </div>
    </div>
  );
};

export default Elements;
