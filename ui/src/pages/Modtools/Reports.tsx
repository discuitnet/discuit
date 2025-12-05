import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Link from '../../components/Link';
import Pagination from '../../components/Pagination';
import PostCard from '../../components/PostCard';
import { mfetchjson, timeAgo, userGroupSingular } from '../../helper';
import { useLoading, usePagination } from '../../hooks';
import { Comment, Community, CommunityReportDetails, Report } from '../../serverTypes';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import { Post } from '../../slices/postsSlice';
import ReportsView from './ReportsView';

const Reports = ({ community }: { community: Community }) => {
  const dispatch = useDispatch();

  const [page, setPage] = usePagination();
  const limit = 10;

  const [details, setDetails] = useState<CommunityReportDetails | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useLoading();
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    (async () => {
      try {
        const json = await mfetchjson(
          `/api/communities/${community.id}/reports?filter=${filter}&page=${page}&limit=${limit}`
        );
        setReports(json.reports);
        setDetails(json.details);
        setLoading('loaded');
      } catch {
        setLoading('error');
      }
    })();
  }, [filter, community.id, page, setLoading]);

  const handleIgnore = async (report: Report) => {
    try {
      await mfetchjson(`/api/communities/${community.id}/reports/${report.id}`, {
        method: 'DELETE',
      });
      setReports((reports) => reports.filter((r) => r.id !== report.id));
      dispatch(snackAlert('Report ignored.'));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  if (loading !== 'loaded' || !details) {
    return <div className="modtools-content"></div>;
  }

  let noPosts = details.noReports;
  if (filter === 'posts') noPosts = details.noPostReports;
  else if (filter === 'comments') noPosts = details.noCommentReports;

  const noPages = Math.ceil(noPosts / limit);

  return (
    <ReportsView
      title="Reports"
      noPosts={details.noPostReports}
      noComments={details.noCommentReports}
      filter={filter}
      setFilter={setFilter}
    >
      <div className="modtools-reports-posts">
        {reports &&
          reports.map((report) => {
            let item;
            let handleURL = '';
            let removed = false;
            let removedUser = '';
            if (report.type === 'post') {
              const post = report.target as Post;
              handleURL = `/${post.communityName}/post/${post.publicId}`;
              item = <PostCard initialPost={post} compact inModTools />;
              if (post.deletedAt) {
                removed = true;
                removedUser = userGroupSingular(post.deletedAs!);
              }
            } else {
              const comment = report.target as Comment;
              handleURL = `/${community.name}/post/${comment.postPublicId}/${comment.id}`;
              item = (
                <div>
                  <Link to={handleURL}>{comment.body}</Link>
                </div>
              );
            }
            return (
              <div key={report.id} className="card card-padding card-report">
                <div className="card-report-head">
                  <div className="left">Reason: {report.reason}.</div>
                  <div className="right">{timeAgo(report.createdAt)}</div>
                </div>
                {removed && <div className="card-report-removed">Removed by {removedUser}.</div>}
                <div className="card-report-item">{item}</div>
                <div className="card-report-buttons">
                  <button onClick={() => handleIgnore(report)}>Ignore</button>
                  <Link className="button button-red" to={handleURL}>
                    Handle
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
      {reports && reports.length > 0 && (
        <Pagination current={page} noPages={noPages} onClick={(n) => setPage(n)} />
      )}
    </ReportsView>
  );
};

export default Reports;
