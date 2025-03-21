import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from '../../components/Button';
import { FormField, FormSection } from '../../components/Form';
import { Checkbox } from '../../components/Input';
import PageLoading from '../../components/PageLoading';
import { mfetch, mfetchjson } from '../../helper';
import { SiteSettings } from '../../serverTypes';
import { createCommunityModalOpened, snackAlertError } from '../../slices/mainSlice';

export default function Settings() {
  const dispatch = useDispatch();

  const [settings, _setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    const fetch = async () => {
      try {
        const json = await mfetchjson('/api/site_settings');
        _setSettings(json);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    };
    fetch();
  }, [dispatch]);
  const [changed, setChanged] = useState(false);
  const setSettings = (value: React.SetStateAction<SiteSettings | null>) => {
    _setSettings(value);
    setChanged(true);
  };

  const signupsEnabled = settings ? !settings.signupsDisabled : true;
  const setSignupsEnabled = (value: boolean) =>
    setSettings((prev) => {
      return {
        ...prev,
        signupsDisabled: !value,
      };
    });

  const handleSave = async () => {
    try {
      await mfetch('/api/site_settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setChanged(false);
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  if (settings === null) {
    return <PageLoading />;
  }

  return (
    <div className="dashboard-page-settings document">
      <div className="dashboard-page-title">Settings</div>
      <div className="dashboard-page-content">
        <div className="dashboard-settings-form">
          <FormSection>
            <FormField>
              <Checkbox
                variant="switch"
                label="Enable sign-ups"
                checked={signupsEnabled}
                onChange={(event) => {
                  if (confirm('Are you sure?')) {
                    setSignupsEnabled(event.target.checked);
                  }
                }}
              />
            </FormField>
            <FormSection>
              <FormField>
                <Button
                  onClick={() => dispatch(createCommunityModalOpened())}
                  className={'button button-main home-btn-new-post'}
                >
                  Create community
                </Button>
              </FormField>
            </FormSection>
          </FormSection>
          <FormSection>
            <Button color="main" disabled={!changed} onClick={handleSave}>
              Save
            </Button>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
