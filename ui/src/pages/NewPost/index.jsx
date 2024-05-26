import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { APIError, isValidHttpUrl, mfetch, mfetchjson } from '../../helper';
import { useLoading, useQuery } from '../../hooks';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import SelectCommunity from './SelectCommunity';
import { ButtonClose } from '../../components/Button';
import { Helmet } from 'react-helmet-async';
import Rules from '../Community/Rules';
import PageLoading from '../../components/PageLoading';
import Link from '../../components/Link';
import AsUser from '../Post/AsUser';
import Textarea from '../../components/Textarea';
import Image from './Image';
import Spinner from '../../components/Spinner';
import { postAdded } from '../../slices/postsSlice';
import { useLocation } from 'react-router-dom/cjs/react-router-dom.min';
import CommunityCard from '../Post/CommunityCard';

const NewPost = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;
  useEffect(() => {
    if (!loggedIn) history.push('/login');
  }, [loggedIn]);

  const query = useQuery();
  const isEditPost = query.has('edit');
  const editPostId = query.get('edit');
  const [changed, setChanged] = useState(false);

  const [postType, setPostType] = useState('text');
  const [userGroup, setUserGroup] = useState('normal');

  const bannedFrom = useSelector((state) => state.main.bannedFrom);
  const [community, setCommunity] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [isRestrictPost, setIsRestrictPost] = useState(false)
  useEffect(() => {
    if (community !== null) {
      const _isBanned = bannedFrom.find((id) => id === community.id) !== undefined;
      if (_isBanned) {
        alert(`You are banned from ${community.name}`);
      }
      setIsBanned(_isBanned);
      setIsRestrictPost(community.restrictPost);
      if (isRestrictPost && (!user.isAdmin && !isMod)) {
        alert(`Posting to ${community.name} is restricted to moderators or admins`);
      }
    } else {
      setIsBanned(false);
      setIsRestrictPost(false);
    }
    setIsMod(community === null ? false : community.userMod);
  }, [community]);

  const handleCommunityChange = async (ncomm) => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${ncomm.id}`);
      setCommunity(rcomm);
      setIsRestrictPost(rcomm.restrictPost);
      const query = new URLSearchParams(history.location.search);
      if (query.get('community') !== ncomm.name) {
        query.set('community', ncomm.name);
        history.replace(`${history.location.pathname}?${query.toString()}`);
      }
    } catch (error) {
      snackAlertError(error);
    }
  };

  const [title, _setTitle] = useState('');
  const setTitle = (title) => _setTitle(title.length > 255 ? title.substr(0, 256) : title);
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState(null);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useLoading();
  useEffect(() => {
    if (isEditPost) {
      (async () => {
        try {
          const post = await mfetchjson(`/api/posts/${editPostId}?fetchCommunity=true`);
          setCommunity(post.community);
          setTitle(post.title);
          setBody(post.body);
          setPost(post);
          if (post.type === 'image') {
            setImage(post.image);
          } else if (post.type === 'link') {
            setLink(post.deletedContent ? 'Deleted link' : post.link.url);
          }
          setPostType(post.type);
          setLoading('loaded');
        } catch (error) {
          dispatch(snackAlertError(error));
        }
      })();
    } else {
      setLoading('loaded');
    }
  }, [editPostId]);

  useLayoutEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = 'scroll';
    };
  }, []);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef();
  const handleAddPhoto = () => {
    fileInputRef.current.click();
  };
  const [isUploading, setIsUploading] = useState(false);
  const abortController = useRef(new AbortController());
  const uploadImage = async (file) => {
    if (isUploading) return;
    try {
      const data = new FormData();
      data.append('image', file);
      setIsUploading(true);
      const res = await mfetch('/api/_uploads', {
        signal: abortController.current.signal,
        method: 'POST',
        body: data,
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          if (error.code === 'file_size_exceeded') {
            dispatch(snackAlert('Maximum file size exceeded.'));
            return;
          } else if (error.code === 'unsupported_image') {
            dispatch(snackAlert('Unsupported image.'));
            return;
          }
        }
        throw new APIError(res.status, await res.json());
      }
      const resImage = await res.json();
      setImage(resImage);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        dispatch(snackAlertError(error));
      }
    } finally {
      setIsUploading(false);
    }
  };
  const handleFileChange = () => {
    uploadImage(fileInputRef.current.files[0]);
  };
  const dropzoneRef = useRef();
  const handleOnDrop = (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      uploadImage(dt.files[0]);
    }
  };
  const handleImageDelete = () => {
    // TODO: send DELETE request to server.
    setImage(null);
  };

  // For only when editing a post.
  const returnToWhence = (post) => {
    const state = location.state;
    if (state && state.fromPostPage) {
      // fromPostPage property is set manually upon edit button click.
      history.goBack();
    } else {
      history.replace(`/${post.communityName}/post/${post.publicId}`);
    }
  };

  const [isSubmitDisabled, setIsSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    if (isBanned) {
      alert('You are banned from community');
      return;
    }
    if (isRestrictPost && (!user.isAdmin && !isMod)) {
      alert('Posting to community is restricted to moderators or admins');
      return;
    }
    if (community === null) {
      alert('Select a community first');
      return;
    }
    if (title.length < 3) {
      if (title.length === 0) {
        alert('Your post needs a title');
        return;
      }
      alert('Title is too short');
      return;
    }
    if (postType === 'image') {
      if (image === null) {
        alert("You haven't uploaded an image");
        return;
      }
    }
    if (postType === 'link') {
      if (link === '') {
        alert('Please submit a valid URL');
        return;
      }
    }
    try {
      setIsSubmitting(true);
      let newPost;
      if (isEditPost) {
        newPost = await mfetchjson(`/api/posts/${editPostId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, body, userGroup }),
        });
      } else {
        const res = await mfetch('/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            type: postType,
            title,
            body,
            community: community.name,
            userGroup,
            imageId: postType === 'image' ? image.id : undefined,
            url: postType === 'link' ? link : undefined,
          }),
        });
        if (!res.ok) {
          if (res.status === 400) {
            const error = await res.json();
            if (error.code === 'invalid_url') {
              dispatch(snackAlert('The URL you provided is not a valid URL.'));
              return;
            }
          }
          throw new APIError(res.status, await res.json());
        }
        newPost = await res.json();
      }
      dispatch(postAdded(newPost));
      returnToWhence(newPost);
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    const listner = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', listner);
    return () => window.removeEventListener('keydown', listner);
  }, [handleSubmit]);
  const handleCancel = () => {
    if (((changed || isUploading) && confirm('Are you sure you want to leave?')) || !changed) {
      if (isUploading) abortController.current.abort();
      if (window.appData.historyLength > 1) {
        history.goBack();
      } else {
        history.replace('/');
      }
    }
  };

  const overrideTitle = useRef(true);
  const handleTitleChange = (e) => {
    overrideTitle.current = e.target.value === '';
    if (!changed) setChanged(true);
    setTitle(e.target.value);
  };

  const handleBodyChange = (e) => {
    if (!changed) setChanged(true);
    setBody(e.target.value);
  };
  const handleBodyPaste = (e) => {
    let paste = (e.clipboardData || window.clipboardData).getData('text');
    if (body.trim() === '' && !isEditPost && isValidHttpUrl(paste) && overrideTitle.current) {
      setPostType('link');
      handleLinkChange({ target: { value: paste } });
      autoFillTitle(paste);
    }
  };

  const handleLinkChange = (e) => {
    if (!changed) setChanged(true);
    setLink(e.target.value);
  };
  const autoFillTitle = async (url) => {
    // overrideTitle.current = true;
    try {
      const res = await mfetchjson(`/api/_link_info?url=${encodeURIComponent(url)}`);
      setChanged(true);
      if (overrideTitle.current === true && res.title !== '') {
        setTitle(res.title);
      }
    } catch (error) {
      console.error(error);
    }
  };
  const handleLinkPaste = (e) => {
    let paste = (e.clipboardData || window.clipboardData).getData('text');
    if (isValidHttpUrl(paste) && overrideTitle.current) {
      autoFillTitle(paste);
    }
  };

  // Prevent image load on missing drop-zone.
  useEffect(() => {
    const handleDrop = (e) => {
      if (!['TEXTAREA', 'INPUT'].includes(e.target.nodeName)) e.preventDefault();
    };
    const handleDragOver = (e) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  if (loading !== 'loaded') {
    return (
      <div className="page-new">
        <PageLoading />
      </div>
    );
  }

  const isImagePostsDisabled = CONFIG.disableImagePosts === true;

  return (
    <div className="page-new">
      <Helmet>
        <title>{isEditPost ? 'Edit Post' : 'New Post'}</title>
      </Helmet>
      <div className="page-new-topbar">
        <div className="page-new-topbar-title">{isEditPost ? 'Edit post' : 'Create a post'}</div>
        <ButtonClose onClick={handleCancel} />
      </div>
      <div className="page-new-content">
        <div className="page-new-content-post">
          <SelectCommunity
            onChange={handleCommunityChange}
            disabled={isEditPost}
            initial={community ? community.name : ''}
          />
          <div className="card page-new-form">
            <div className={'page-new-tabs' + (isImagePostsDisabled ? ' is-two-tabs' : '')}>
              <button
                className={
                  'button-clear button-with-icon pn-tabs-item' +
                  (postType === 'text' ? ' is-selected' : '')
                }
                onClick={() => setPostType('text')}
                disabled={isEditPost}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 0 24 24"
                  width="24px"
                  fill="currentColor"
                  className="page-new-icon-text"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z" />
                </svg>
                <span>Text</span>
              </button>
              {!isImagePostsDisabled && (
                <button
                  className={
                    'button-clear button-with-icon pn-tabs-item' +
                    (postType === 'image' ? ' is-selected' : '')
                  }
                  onClick={() => setPostType('image')}
                  disabled={isEditPost}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="currentColor"
                    className="page-new-icon-image"
                  >
                    <path d="M0 0h24v24H0V0z" fill="none" />
                    <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
                  </svg>
                  <span>Image</span>
                </button>
              )}
              <button
                className={
                  'button-clear button-with-icon pn-tabs-item' +
                  (postType === 'link' ? ' is-selected' : '')
                }
                onClick={() => setPostType('link')}
                disabled={isEditPost}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 0 24 24"
                  width="24px"
                  fill="currentColor"
                  className="page-new-icon-link"
                >
                  <path d="M0 0h24v24H0V0z" fill="none" />
                  <path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z" />
                </svg>
                <span>Link</span>
              </button>
            </div>
            <Textarea
              className="page-new-post-title"
              placeholder="Post title goes here..."
              value={title}
              onChange={handleTitleChange}
              rows="1"
              adjustable
            />
            {postType === 'text' && (
              <Textarea
                className="page-new-post-body"
                placeholder="Post content goes here (optional)..."
                value={body}
                onChange={handleBodyChange}
                onPaste={handleBodyPaste}
                adjustable
                disabled={isEditPost ? post.deletedContent : false}
              />
            )}
            {postType === 'image' && (
              <div className="page-new-image-upload">
                {image && <Image image={image} onClose={handleImageDelete} disabled={isEditPost} />}
                {!image && !(post && post.deletedContent) && (
                  <div
                    ref={dropzoneRef}
                    className={'page-new-image-drop' + (isDraggingOver ? ' is-dropping' : '')}
                    onClick={handleAddPhoto}
                    onDragEnter={() => {
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => {
                      setIsDraggingOver(false);
                    }}
                    onDragOver={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsDraggingOver(false);
                      handleOnDrop(e);
                    }}
                  >
                    <div className="page-new-image-text">
                      {!isUploading && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            name="image"
                            style={{ visibility: 'hidden', width: 0, height: 0 }}
                            onChange={handleFileChange}
                          />
                          <div>Add photo</div>
                          <div>Or drag and drop</div>
                        </>
                      )}
                      {isUploading && (
                        <div className="flex flex-center page-new-image-uploading">
                          <div className="page-new-uploading-text">Uploading image</div>
                          <Spinner style={{ marginLeft: 5 }} size={25} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {post && post.deletedContent && (
                  <div className="page-new-image-deleted flex flex-column flex-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 0 24 24"
                      width="24px"
                      fill="currentColor"
                    >
                      <path d="M0 0h24v24H0V0z" fill="none" />
                      <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
                    </svg>
                    <p>Deleted image</p>
                  </div>
                )}
              </div>
            )}
            {postType === 'link' && (
              <Textarea
                className="page-new-post-body"
                placeholder="Paste URL here..."
                value={link}
                onChange={handleLinkChange}
                onPaste={handleLinkPaste}
                adjustable
                disabled={isEditPost}
              />
            )}
          </div>
          {!isEditPost && (
            <div className="new-page-user-group">
              <AsUser isMod={isMod} onChange={(g) => setUserGroup(g)} />
            </div>
          )}
          <div className="new-page-help">
            {'Use '}
            <Link to="/markdown_guide" target="_blank">
              Markdown
            </Link>
            {' to format posts.'}
          </div>
          <div className="page-new-buttons is-no-m">
            <button className="button-main" onClick={handleSubmit} disabled={isSubmitDisabled}>
              Submit
            </button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        </div>
        <div className="new-page-sidebar">
          {community && (
            <>
              <CommunityCard community={community} />
              <Rules rules={community.rules} communityName={community.name} unordered />
            </>
          )}
        </div>
        <div className="page-new-buttons is-m">
          <button className="button-main" onClick={handleSubmit} disabled={isSubmitDisabled}>
            Submit
          </button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default NewPost;
