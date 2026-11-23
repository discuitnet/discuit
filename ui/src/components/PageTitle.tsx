import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MainState } from '../slices/mainSlice';
import { RootState } from '../store';

interface PageTitleProps {
  title?: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  const notifsNewCount = useSelector<RootState>(
    (state) => state.main.notifications.newCount
  ) as MainState['notifications']['newCount'];
  useEffect(() => {
    const prefix = notifsNewCount > 0 ? `(${notifsNewCount}) ` : '';
    const siteName = import.meta.env.VITE_SITENAME;
    document.title = title ? `${prefix}${title} - ${siteName}` : `${prefix}${siteName}`;
    return () => {
      document.title = `${prefix}${siteName}`;
    };
  }, [notifsNewCount, title]);

  return null;
}
