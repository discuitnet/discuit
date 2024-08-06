import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CommunityProPic from '../../components/CommunityProPic';
import { InputWithCount, useInputMaxLength } from '../../components/Input';
import { mfetch, mfetchjson } from '../../helper';
import { communityAdded } from '../../slices/communitiesSlice';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import Banner from '../Community/Banner';

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
  const [nsfw, setNSFW] = useState(community.nsfw);

  const handleSave = async () => {
    try {
      const rcomm = await mfetchjson(`/api/communities/${community.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...community,
          nsfw,
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
  }, [description, nsfw]);

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
      <div className="flex-column inner-gap-1">
        <div className="input-with-label width-50">
          <div className="input-label-box">
            <div className="label">Community name</div>
            <input type="text" value={community.name} disabled />
          </div>
        </div>
        <div className="modtools-change-propic">
          <div className="label">Profile picture</div>
          <div className="flex">
            <CommunityProPic name={community.name} proPic={community.proPic} size="standard" />
            <button onClick={() => proPicFileInputRef.current.click()} disabled={isUploading}>
              Change
            </button>
            <button onClick={handleDeleteProPic} disabled={isUploading}>
              Delete
            </button>
            <input
              ref={proPicFileInputRef}
              type="file"
              name="image"
              style={{ visibility: 'hidden', width: 0, height: 0 }}
              onChange={handleProPicFileChange}
            />
          </div>
        </div>
        <div className="modtools-change-banner">
          <div className="label">Banner image</div>
          <div className="flex flex-column">
            <Banner className="modtools-banner" community={community} />
            <div className="flex modtools-change-banner-buttons">
              <button onClick={() => bannerFileInputRef.current.click()} disabled={isUploading}>
                Change
              </button>
              <button onClick={handleDeleteBannerImage} disabled={isUploading}>
                Delete
              </button>
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
        <InputWithCount
          textarea
          rows="5"
          label="Description"
          description="A short description to quickly let people know what it's all about."
          maxLength={descriptionMaxLength}
          value={description}
          onChange={setDescription}
        />
        <div className="input-with-label">
          <div className="input-label-box">
            <div className="label">NSFW</div>
          </div>
          <div className="checkbox is-check-last">
            <label htmlFor="c1" style={{ width: 'calc(100% - 25px)' }}>
              Tick this box if the community may contain 18+ or material otherwise unsuitable for
              viewing in a professional environment.
            </label>
            <input
              className="switch"
              id="c1"
              type="checkbox"
              checked={nsfw}
              onChange={(e) => setNSFW(e.target.checked)}
            />
          </div>
        </div>
        {user.isAdmin && (
          <button onClick={handleChangeDefault}>
            {community.isDefault ? 'Remove as default community' : 'Set as default community'}
          </button>
        )}
      </div>
      <div className="flex-column modtools-settings-save-container">
        <button className="button-main" onClick={handleSave} disabled={!changed}>
          Save {changed}
        </button>
      </div>
    </div>
  );
};

Settings.propTypes = {
  community: PropTypes.object.isRequired,
};

export default Settings;
