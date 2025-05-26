import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CommunityProPic from '../../components/CommunityProPic';
import { FormField } from '../../components/Form';
import ImageEditModal from '../../components/ImageEditModal';
import Input, { Checkbox, InputWithCount, useInputMaxLength } from '../../components/Input';
import { APIError, mfetch, mfetchjson, selectImageCopyURL } from '../../helper';
import { useImageEdit } from '../../hooks/useImageEdit';
import { Community } from '../../serverTypes';
import { communityAdded } from '../../slices/communitiesSlice';
import { MainState, snackAlert, snackAlertError } from '../../slices/mainSlice';
import { RootState } from '../../store';
import Banner from '../Community/Banner';

const descriptionMaxLength = 2000;

const Settings = ({ community }: { community: Community }) => {
  const dispatch = useDispatch();

  const user = useSelector<RootState>((state) => state.main.user) as MainState['user'];

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

  const proPicFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const updloadImage = async (file: File, url: string) => {
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
    const files = proPicFileInputRef.current?.files;
    if (files && files.length > 0) {
      updloadImage(files[0], `/api/communities/${community.id}/pro_pic`);
    }
  };
  const handleBannerFileChange = () => {
    const files = bannerFileInputRef.current?.files;
    if (files && files.length > 0) {
      updloadImage(files[0], `/api/communities/${community.id}/banner_image`);
    }
  };

  /*
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
  */

  const [communityPicModalOpen, setCommunityPicModalOpen] = useState(false);
  const [communityBannerModalOpen, setCommunityBannerModalOpen] = useState(false);

  const {
    isUploading: isUploadingPic,
    isDeleting: isDeletingPic,
    handleUpload: handleUploadCommunityPic,
    handleDelete: handleDeleteCommunityPic,
    handleSaveAltText: handleSaveCommunityPicAltText,
  } = useImageEdit(`/api/communities/${community.id}/pro_pic`, (res) => {
    dispatch(communityAdded(res));
  });

  const {
    isUploading: isUploadingBanner,
    isDeleting: isDeletingBanner,
    handleUpload: handleUploadCommunityBanner,
    handleDelete: handleDeleteCommunityBanner,
    handleSaveAltText: handleSaveCommunityBannerAltText,
  } = useImageEdit(`/api/communities/${community.id}/banner_image`, (res) => {
    dispatch(communityAdded(res));
  });

  const handleSaveCommunityPicAlt = (altText: string) => {
    if (!community) return dispatch(snackAlert('No community to update.', null));
    if (!community.proPic) return dispatch(snackAlert('No profile picture to update.', null));
    handleSaveCommunityPicAltText(altText, community.proPic.id).then((success) => {
      if (success) {
        if (community.proPic) community.proPic.altText = altText;
        setCommunityPicModalOpen(false);
      }
    });
  };

  const handleSaveCommunityBannerAlt = (altText: string) => {
    if (!community) return dispatch(snackAlert('No community to update.', null));
    if (!community.bannerImage) return dispatch(snackAlert('No banner image to update.', null));
    handleSaveCommunityBannerAltText(altText, community.bannerImage.id).then((success) => {
      if (success) {
        if (community.bannerImage) community.bannerImage.altText = altText;
        setCommunityBannerModalOpen(false);
      }
    });
  };

  const handleChangeDefault = async () => {
    try {
      await mfetchjson(`/api/_admin`, {
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
              <button onClick={() => setCommunityBannerModalOpen(true)}>Edit banner image</button>
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
            rows={5}
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
        {user && user.isAdmin && (
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
        open={communityBannerModalOpen}
        onClose={() => setCommunityBannerModalOpen(false)}
        title="Edit community banner"
        imageUrl={
          community.bannerImage ? selectImageCopyURL('medium', community.bannerImage) : undefined
        }
        altText={community.bannerImage?.altText}
        onUpload={handleUploadCommunityBanner}
        onDelete={handleDeleteCommunityBanner}
        onSave={handleSaveCommunityBannerAlt}
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
