import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MainState } from '../slices/mainSlice';
import { useEffect } from 'react';

interface PageTitleProps {
  title?: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  const notifsNewCount = useSelector<RootState>(
    (state) => state.main.notifications.newCount
  ) as MainState['notifications']['newCount'];
  useEffect(() => {
    const notifsNewCountStr = notifsNewCount > 0 ? `(${notifsNewCount}) ` : '';

    const updateTitle = () => {
      document.title = title
        ? `${notifsNewCountStr}${title} - ${import.meta.env.VITE_SITENAME}`
        : `${notifsNewCountStr}${import.meta.env.VITE_SITENAME}`;
    };

    updateTitle();

    return () => {
      document.title = `${notifsNewCountStr}${import.meta.env.VITE_SITENAME}`;
    };
  }, [notifsNewCount, title]);

  return null;
}
