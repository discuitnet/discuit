import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { useLocation } from 'react-router-dom';
import { getGlobalAppData } from '../../appData';
import Link from '../../components/Link';
import MarkdownTextarea from '../../components/MarkdownTextarea';
import PageLoading from '../../components/PageLoading';
import Spinner from '../../components/Spinner';
import Textarea from '../../components/Textarea';
import { APIError, isValidHttpUrl, mfetch, mfetchjson } from '../../helper';
import { useLoading, useQuery } from '../../hooks';
import { Community, Post, Image as ServerImage } from '../../serverTypes';
import { MainState, snackAlert, snackAlertError } from '../../slices/mainSlice';
import { postAdded } from '../../slices/postsSlice';
import { RootState } from '../../store';
import Rules from '../Community/Rules';
import AsUser from '../Post/AsUser';
import CommunityCard from '../Post/CommunityCard';
import Image from './Image';
import SelectCommunity from './SelectCommunity';

const NewPost = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const user = (useSelector<RootState>((state) => state.main.user) as MainState['user'])!;
  const loggedIn = user !== null;
  useEffect(() => {
    if (!loggedIn) history.push('/login');
  }, [loggedIn, history]);

  const query = useQuery();
  const isEditPost = query.has('edit');
  const editPostId = query.get('edit');
  const [changed, setChanged] = useState(false);

  const [postType, setPostType] = useState('text');
  const [userGroup, setUserGroup] = useState('normal');

  const bannedFrom = useSelector<RootState>(
    (state) => state.main.bannedFrom
  ) as MainState['bannedFrom'];
  const [community, setCommunity] = useState<Community | null>(null);

  const [isBanned, setIsBanned] = useState(false);
  const [isUserMod, setIsUserMod] = useState(false);

  useEffect(() => {
    if (community !== null) {
      const isBanned = bannedFrom.find((id) => id === community.id) !== undefined;
      setIsBanned(isBanned);
    } else {
      setIsBanned(false);
    }
    setIsUserMod(Boolean(community === null ? false : community.userMod));
  }, [community, bannedFrom]);

  const handleCommunityChange = async (ncomm: Community) => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${ncomm.id}`);
      setCommunity(rcomm);
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
  const setTitle = (title: string) =>
    _setTitle(title.length > 255 ? title.substring(0, 256) : title);
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [images, SetImages] = useState<ServerImage[]>([]);
  const maxNumOfImages = import.meta.env.VITE_MAXIMAGESPERPOST;

  const [post, setPost] = useState<Post | null>(null);
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
            SetImages(post.images);
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

  const [isUploading, setIsUploading] = useState(false);
  const abortController = useRef(new AbortController());
  const handleImagesUpload = async (files?: FileList | null) => {
    if (isUploading || !files) {
      return;
    }
    // Check to see if uploading these images would reach the max image limit.
    if (images.length + files.length > maxNumOfImages) {
      alert(
        `Image posts cannot contain more than ${maxNumOfImages} images. Please select fewer images and continue.`
      );
      return;
    }
    setIsUploading(true);
    for (const file of files) {
      try {
        const data = new FormData();
        data.append('image', file);
        const res = await mfetch('/api/_uploads', {
          signal: abortController.current.signal,
          method: 'POST',
          body: data,
        });
        if (!res.ok) {
          setIsUploading(false);
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
        const resImage = (await res.json()) as ServerImage;
        SetImages((images) => {
          return [...images, resImage];
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          dispatch(snackAlertError(error));
        }
        setIsUploading(false);
        break;
      }
    }
    setIsUploading(false);
  };
  const deleteImage = (imageId: string) => {
    // TODO: send DELETE request to server.
    SetImages((images) => images.filter((image) => image.id !== imageId));
  };

  // For only when editing a post.
  const returnToWhence = (post: Post) => {
    const state = location.state as { fromPostPage: boolean };
    if (state && state.fromPostPage) {
      // fromPostPage property is set manually upon edit button click.
      history.goBack();
    } else {
      history.replace(`/${post.communityName}/post/${post.publicId}`);
    }
  };

  const isPostingDisabled =
    community !== null &&
    (isBanned ||
      (!isEditPost && community.postingRestricted && !(isUserMod || (user && user.isAdmin))));

  const getPostingDisabledText = () => {
    if (isBanned) {
      return `You've been banned from ${community?.name}.`;
    } else {
      return `Only approved members of this community can post.`;
    }
  };

  const isAltMissing = () => {
    return user.requireAltText && images.some((img) => !img.altText || img.altText.trim() === '');
  };

  const [_isSubmitDisabled, setIsSubmitting] = useState(false);
  const isSubmitDisabled = _isSubmitDisabled || isUploading || isPostingDisabled || isAltMissing();
  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    if (isBanned) {
      alert('You are banned from community');
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
      if (images.length === 0) {
        alert("You haven't uploaded an image");
        return;
      }
      if (user.requireAltText) {
        if (isAltMissing()) {
          alert(
            "One or more images are missing alt text. Please make sure that you've added alt text to all images."
          );
          return;
        }
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
            images:
              postType === 'image'
                ? images.map((image) => {
                    return {
                      imageId: image.id,
                      caption: '',
                    };
                  })
                : undefined,
            url: postType === 'link' ? link : undefined,
          }),
        });
        if (!res.ok) {
          if (res.status === 400) {
            const error = await res.json();
            if (error.code === 'invalid-url') {
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
    const listner = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', listner);
    return () => window.removeEventListener('keydown', listner);
  }, [handleSubmit]);
  const handleCancel = () => {
    if (((changed || isUploading) && confirm('Are you sure you want to leave?')) || !changed) {
      if (isUploading) abortController.current.abort();
      const historyLength = getGlobalAppData().historyLength || 0;
      if (historyLength > 1) {
        history.goBack();
      } else {
        history.replace('/');
      }
    }
  };

  const overrideTitle = useRef(true);
  const handleTitleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    overrideTitle.current = event.target.value === '';
    if (!changed) setChanged(true);
    setTitle(event.target.value);
  };

  const handleBodyChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    if (!changed) setChanged(true);
    setBody(event.target.value);
  };
  const handleBodyPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const paste = (
      event.clipboardData ||
      (
        window as unknown as {
          clipboardData: {
            getText: (format: string) => string;
          };
        }
      ).clipboardData
    ).getData('text');
    if (body.trim() === '' && !isEditPost && isValidHttpUrl(paste) && overrideTitle.current) {
      setPostType('link');
      _handleLinkChange(paste);
      autoFillTitle(paste);
    }
  };

  const _handleLinkChange = (value: string) => {
    if (!changed) setChanged(true);
    setLink(value);
  };
  const handleLinkChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    _handleLinkChange(event.target.value);
  };
  const autoFillTitle = async (url: string) => {
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
  const handleLinkPaste: React.ClipboardEventHandler = (event) => {
    const paste = (
      event.clipboardData ||
      (
        window as unknown as {
          clipboardData: {
            getText: (format: string) => string;
          };
        }
      ).clipboardData
    ).getData('text');
    if (isValidHttpUrl(paste) && overrideTitle.current) {
      autoFillTitle(paste);
    }
  };

  const imagePostSubmitReqPoints = useSelector<RootState>(
    (state) => state.main.imagePostSubmitReqPoints
  ) as MainState['imagePostSubmitReqPoints'];
  const linkPostSubmitReqPoints = useSelector<RootState>(
    (state) => state.main.linkPostSubmitReqPoints
  ) as MainState['linkPostSubmitReqPoints'];
  const imageSubmitAllowed = imagePostSubmitReqPoints < 1 || user.points > imagePostSubmitReqPoints,
    linkSubmitAllowed = linkPostSubmitReqPoints < 1 || user.points > linkPostSubmitReqPoints;

  if (loading !== 'loaded') {
    return (
      <div className="page-new">
        <PageLoading />
      </div>
    );
  }

  const isImagePostsDisabled = import.meta.env.VITE_DISABLEIMAGEPOSTS === true;

  return (
    <div className="page-content page-new">
      <Helmet>
        <title>{isEditPost ? 'Edit Post' : 'New Post'}</title>
      </Helmet>
      <div className="page-new-content">
        <div className="page-new-content-post">
          <SelectCommunity
            onChange={handleCommunityChange}
            disabled={isEditPost}
            initial={community ? community.name : ''}
          />
          <div className="card page-new-form">
            {isPostingDisabled && (
              <div className="page-new-form-disabled">{getPostingDisabledText()}</div>
            )}
            <div
              className={clsx(
                'page-new-tabs',
                isImagePostsDisabled && ' is-two-tabs',
                isPostingDisabled && 'is-disabled'
              )}
            >
              <button
                className={
                  'button-clear button-with-icon pn-tabs-item' +
                  (postType === 'text' ? ' is-selected' : '')
                }
                onClick={() => setPostType('text')}
                disabled={isPostingDisabled || isEditPost}
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
                  disabled={isPostingDisabled || isEditPost}
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
                disabled={isPostingDisabled || isEditPost}
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
              rows={1}
              adjustable
              disabled={isPostingDisabled}
            />
            {postType === 'text' && (
              <MarkdownTextarea
                className="page-new-post-body"
                placeholder="Post content goes here (optional)..."
                value={body}
                onChange={handleBodyChange}
                onPaste={handleBodyPaste}
                disabled={Boolean(
                  isPostingDisabled || (isEditPost ? post && post.deletedContent : false)
                )}
              />
            )}
            {postType === 'image' && (
              <div className={clsx('page-new-image-upload', !imageSubmitAllowed && 'is-disabled')}>
                {images.length > 0 &&
                  images.map((image, idx) => (
                    <Image
                      key={image.id}
                      image={image}
                      onClose={() => deleteImage(image.id)}
                      disabled={isEditPost}
                      onAltTextSave={(altText) => {
                        SetImages((images) =>
                          images.map((img, i) => (i === idx ? { ...img, altText } : img))
                        );
                        mfetch(`/api/images/${image.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ altText }),
                        });
                      }}
                      requiresAltText={user.requireAltText}
                    />
                  ))}
                {!isEditPost && !(post && post.deletedContent) && (
                  <ImageUploadArea
                    isUploading={isUploading}
                    onImagesUpload={handleImagesUpload}
                    disabled={!imageSubmitAllowed || images.length >= maxNumOfImages}
                    disabledMessage={
                      !imageSubmitAllowed
                        ? "You don't have enough points to submit images yet."
                        : 'Maximum number of images reached.'
                    }
                  />
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
                placeholder={
                  !linkSubmitAllowed
                    ? "You don't have enough points to submit link posts yet."
                    : 'Paste URL here...'
                }
                value={link}
                onChange={handleLinkChange}
                onPaste={handleLinkPaste}
                adjustable
                disabled={!linkSubmitAllowed || isEditPost}
              />
            )}
          </div>
          {!isEditPost && (isUserMod || user.isAdmin) && (
            <div className="new-page-user-group">
              <AsUser isMod={isUserMod} onChange={(g) => setUserGroup(g)} />
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
              <Rules rules={community.rules || []} unordered />
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

const ImageUploadArea = ({
  isUploading,
  onImagesUpload,
  disabled = false,
  disabledMessage = 'Maximum number of images reached.',
}: {
  isUploading: boolean;
  onImagesUpload: (files?: FileList | null) => void;
  disabled?: boolean;
  disabledMessage?: string;
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropzoneRef = useRef(null);
  const handleOnDrop: React.DragEventHandler = (event) => {
    if (disabled) {
      return;
    }
    const dt = event.dataTransfer;
    if (dt.files.length > 0) {
      onImagesUpload(dt.files);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = () => {
    onImagesUpload(fileInputRef.current?.files);
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  // Prevent image load on missing drop-zone.
  useEffect(() => {
    const handleDrop = (event: DragEvent) => {
      if (!['TEXTAREA', 'INPUT'].includes((event.target as Element).nodeName))
        event.preventDefault();
    };
    const handleDragOver = (event: DragEvent) => event.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  return (
    <div
      ref={dropzoneRef}
      className={clsx(
        'page-new-image-drop',
        isDraggingOver && 'is-dropping',
        disabled && 'is-disabled'
      )}
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
        {!disabled && !isUploading && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              name="image"
              style={{ visibility: 'hidden', width: 0, height: 0 }}
              onChange={handleFileChange}
              disabled={disabled}
            />
            <div>Add photo</div>
            <div className="is-small">Or drag and drop</div>
          </>
        )}
        {disabled && <div>{disabledMessage}</div>}
        {isUploading && (
          <div className="flex flex-center page-new-image-uploading">
            <div className="page-new-uploading-text">Uploading image</div>
            <Spinner style={{ marginLeft: 5 }} size={25} />
          </div>
        )}
      </div>
    </div>
  );
};
