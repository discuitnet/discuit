import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CommunityProPic from '../../components/CommunityProPic';
import { FormField } from '../../components/Form';
import Input, { Checkbox, InputWithCount, useInputMaxLength } from '../../components/Input';
import { APIError, mfetch, mfetchjson } from '../../helper';
import { communityAdded } from '../../slices/communitiesSlice';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import Banner from '../Community/Banner';
import ImageEditModal from '../../components/ImageEditModal';
import { selectImageCopyURL } from '../../helper';

const descriptionMaxLength = 2000;

const Settings = ({ community }) => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.main.user);
  const loggedIn = user !== null;

  const [_changed, setChanged] = useState(-1);

  const [description, setDescription] = useInputMaxLength(
    descriptionMaxLength,
    community.about || ''
  );
  const [postingRestricted, setPostingRestricted] = useState(community.postingRestricted);

  const handleSave = async () => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${community.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...community,
          postingRestricted,
          about: description,
        }),
      });
      dispatch(communityAdded(rcomm));
      dispatch(snackAlert('Settings saved.'));
      setChanged(-1);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const changed = _changed > 0;
  useEffect(() => {
    setChanged((c) => c + 1);
  }, [description, postingRestricted]);

  const proPicFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const updloadImage = async (file, url) => {
    if (isUploading) return;
    try {
      const data = new FormData();
      data.append('image', file);
      setIsUploading(true);
      const res = await mfetch(url, {
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
      const rcomm = await res.json();
      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploading(false);
    }
  };
  const handleProPicFileChange = () => {
    updloadImage(proPicFileInputRef.current.files[0], `/api/communities/${community.id}/pro_pic`);
  };
  const handleBannerFileChange = () => {
    updloadImage(
      bannerFileInputRef.current.files[0],
      `/api/communities/${community.id}/banner_image`
    );
  };

  const handleDeleteProPic = async () => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${community.id}/pro_pic`, {
        method: 'DELETE',
      });
      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleDeleteBannerImage = async () => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${community.id}/banner_image`, {
        method: 'DELETE',
      });
      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  //
  const [communityPicModalOpen, setCommunityPicModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingPic, setIsDeletingPic] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  //
  const handleUploadCommunityPic = async (file) => {
    if (isUploadingPic) return;

    try {
      setIsUploadingPic(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await mfetch(`/api/communities/${community.id}/pro_pic`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
      } else {
        throw new APIError(res.status, await res.json());
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleDeleteCommunityPic = async () => {
    if (isDeletingPic) return;

    try {
      setIsDeletingPic(true);
      const rcomm = await mfetchjson(`/api/communities/${community.id}/pro_pic`, {
        method: 'DELETE',
      });

      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsDeletingPic(false);
    }
  };

  const handleUploadBanner = async (file) => {
    if (isUploadingBanner) return;

    try {
      setIsUploadingBanner(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await mfetch(`/api/communities/${community.id}/banner_image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
      } else {
        throw new APIError(res.status, await res.json());
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (isDeletingBanner) return;

    try {
      setIsDeletingBanner(true);
      const rcomm = await mfetchjson(`/api/communities/${community.id}/banner_image`, {
        method: 'DELETE',
      });

      dispatch(communityAdded(rcomm));
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsDeletingBanner(false);
    }
  };

  const handleSaveAltText = async (altText, imageId) => {
    try {
      await mfetchjson(`/api/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ altText }),
      });

      dispatch(snackAlert('Alt text saved.'));
      setBannerModalOpen(false);
      setCommunityPicModalOpen(false);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleSaveCommunityPicAlt = async (altText) => {
    const communityPicId = community.proPic.id;
    handleSaveAltText(altText, communityPicId);
    community.proPic.altText = altText;
  };

  const handleSaveBannerAlt = async (altText) => {
    const bannerId = community.bannerImage.id;
    handleSaveAltText(altText, bannerId);
    community.bannerImage.altText = altText;
  };
  //

  const handleChangeDefault = async () => {
    try {
      const res = await mfetchjson(`/api/_admin`, {
        method: 'POST',
        body: JSON.stringify({
          action: community.isDefault ? 'remove_default_forum' : 'add_default_forum',
          name: community.name,
        }),
      });
      dispatch(
        communityAdded({
          ...community,
          isDefault: !community.isDefault,
        })
      );
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  return (
    <div className="modtools-content modtools-settings">
      <div className="modtools-content-head">
        <div className="modtools-title">Community settings</div>
      </div>
      {/*<div className="flex-column inner-gap-1">*/}
      <div className="form">
        <FormField label="Community name">
          <Input value={community.name} disabled />
        </FormField>
        <FormField label="Profile picture">
          <div className=" modtools-change-propic">
            <div className="flex">
              <CommunityProPic name={community.name} proPic={community.proPic} size="standard" />
              <button onClick={() => setCommunityPicModalOpen(true)}>Edit profile picture</button>

              <input
                ref={proPicFileInputRef}
                type="file"
                name="image"
                style={{ visibility: 'hidden', width: 0, height: 0 }}
                onChange={handleProPicFileChange}
              />
            </div>
          </div>
        </FormField>
        <div className="form-field modtools-change-banner">
          <div className="label">Banner image</div>
          <div className="flex flex-column">
            <Banner className="modtools-banner" community={community} />
            <div className="flex modtools-change-banner-buttons">
              <button onClick={() => setBannerModalOpen(true)}>Edit banner image</button>
            </div>
            <input
              ref={bannerFileInputRef}
              type="file"
              name="image"
              style={{ visibility: 'hidden', width: 0, height: 0 }}
              onChange={handleBannerFileChange}
            />
          </div>
        </div>
        <FormField
          label="Description"
          description="A short description to quickly let people know what it's all about."
        >
          <InputWithCount
            textarea
            rows="5"
            maxLength={descriptionMaxLength}
            value={description}
            onChange={setDescription}
          />
        </FormField>
        <FormField label="Posting restricted">
          <Checkbox
            variant="switch"
            label="Only moderators of this community are allowed to post."
            checked={postingRestricted}
            onChange={(e) => setPostingRestricted(e.target.checked)}
            spaceBetween
          />
        </FormField>
        {user.isAdmin && (
          <FormField>
            <button onClick={handleChangeDefault}>
              {community.isDefault ? 'Remove as default community' : 'Set as default community'}
            </button>
          </FormField>
        )}
        <FormField>
          <button
            className="button-main"
            onClick={handleSave}
            disabled={!changed}
            style={{ width: '100%' }}
          >
            Save {changed}
          </button>
        </FormField>
      </div>

      <ImageEditModal
        open={communityPicModalOpen}
        onClose={() => setCommunityPicModalOpen(false)}
        title="Edit community icon"
        imageUrl={community.proPic ? selectImageCopyURL('medium', community.proPic) : undefined}
        altText={community.proPic?.altText}
        onUpload={handleUploadCommunityPic}
        onDelete={handleDeleteCommunityPic}
        onSave={handleSaveCommunityPicAlt}
        uploading={isUploadingPic}
        deleting={isDeletingPic}
      />

      <ImageEditModal
        open={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        title="Edit community banner"
        imageUrl={
          community.bannerImage ? selectImageCopyURL('medium', community.bannerImage) : undefined
        }
        altText={community.bannerImage?.altText}
        onUpload={handleUploadBanner}
        onDelete={handleDeleteBanner}
        onSave={handleSaveBannerAlt}
        uploading={isUploadingBanner}
        deleting={isDeletingBanner}
        isCircular={false}
      />
    </div>
  );
};

Settings.propTypes = {
  community: PropTypes.object.isRequired,
};

export default Settings;
