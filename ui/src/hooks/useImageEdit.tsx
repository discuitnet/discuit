import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { mfetchjson } from '../helper';
import { snackAlert, snackAlertError } from '../slices/mainSlice';

export function useImageEdit<T = unknown>(apiEndpoint: string, onComplete?: (data: T) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dispatch = useDispatch();

  const handleUpload = async (file: File) => {
    if (isUploading) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await mfetchjson(apiEndpoint, {
        method: 'POST',
        body: formData,
      });
      if (onComplete) onComplete(res as T);
      return res;
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const res = await mfetchjson(apiEndpoint, {
        method: 'DELETE',
      });
      if (onComplete) onComplete(res);
      return res;
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAltText = async (altText: string, imageId: string) => {
    try {
      await mfetchjson(`/api/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ altText }),
      });
      dispatch(snackAlert('Alt text saved.', null));
      return true;
    } catch (error) {
      dispatch(snackAlertError(error));
      return false;
    }
  };

  return {
    isUploading,
    isDeleting,
    handleUpload,
    handleDelete,
    handleSaveAltText,
  };
}
