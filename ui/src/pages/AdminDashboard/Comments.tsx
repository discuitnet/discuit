import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from '../../components/Button';
import PageLoading from '../../components/PageLoading';
import SimpleFeed, { SimpleFeedItem } from '../../components/SimpleFeed';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { Comment } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';
import { MemorizedComment } from '../User/Comment';

interface SiteCommentsState {
  comments: Comment[] | null;
  next: string | null;
}

export default function Comments() {
  const [commentsState, setCommentsState] = useState<SiteCommentsState>({
    comments: null,
    next: null,
  });
  const [loading, setLoading] = useLoading('loading');

  const dispatch = useDispatch();
  useEffect(() => {
    console.log('Running ');
    const f = async () => {
      try {
        const res = await fetchSiteComments();
        console.log(res);
        setCommentsState(res);
        setLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setLoading('error');
      }
    };
    f();
  }, []);

  const [feedReloading, setFeedReloading] = useState(false);
  const fetchNextItems = async () => {
    if (feedReloading || !commentsState.next) return;
    try {
      setFeedReloading(true);
      const res = await fetchSiteComments(commentsState.next);
      setCommentsState((prev) => {
        return {
          comments: [...prev.comments!, ...(res.comments || [])],
          next: res.next,
        };
      });
    } catch (error) {
      dispatch(snackAlertError(error));
    } finally {
      setFeedReloading(false);
    }
  };

  const handleRenderItem = (item: Comment) => {
    return <MemorizedComment comment={item} />;
  };

  if (loading !== 'loaded') {
    return <PageLoading />;
  }

  const feedItems: SimpleFeedItem<Comment>[] = [];
  commentsState.comments!.forEach((comment) => feedItems.push({ item: comment, key: comment.id }));

  return (
    <div className="dashboard-page-comments document">
      <div className="dashboard-page-title">Comments</div>
      <div className="dashboard-page-content">
        <SimpleFeed items={feedItems} onRenderItem={handleRenderItem} />
        <Button className="is-more-button" loading={feedReloading} onClick={fetchNextItems}>
          More
        </Button>
      </div>
    </div>
  );
}

async function fetchSiteComments(next?: string): Promise<SiteCommentsState> {
  return mfetchjson(`/api/comments` + (next !== undefined ? `?next=${next}` : ''));
}
