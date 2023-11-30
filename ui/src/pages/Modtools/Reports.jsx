import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Link from '../../components/Link';
import PostCard from '../../components/PostCard';
import { mfetchjson, timeAgo, userGroupSingular } from '../../helper';
import { useLoading, usePagination } from '../../hooks';
import { useDispatch } from 'react-redux';
import { snackAlert, snackAlertError } from '../../slices/mainSlice';
import ReportsView from './ReportsView';
import Pagination from '../../components/Pagination';

const Reports = ({ community }) => {
  const dispatch = useDispatch();

  const [page, setPage] = usePagination();
  const limit = 10;

  const [details, setDetails] = useState(null);
  const [reports, setReports] = useState([]);
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
      } catch (error) {
        setLoading('failed');
      }
    })();
  }, [filter, community.id, page]);

  const handleIgnore = async (report) => {
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

  if (loading !== 'loaded') {
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
            let removedUser;
            if (report.type === 'post') {
              const post = report.target;
              handleURL = `/${post.communityName}/post/${post.publicId}`;
              item = <PostCard initialPost={post} compact inModTools />;
              if (post.deletedAt) {
                removed = true;
                removedUser = userGroupSingular(post.deletedAs);
              }
            } else {
              const comment = report.target;
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
      <Pagination current={page} noPages={noPages} onClick={(n) => setPage(n)} />
    </ReportsView>
  );
};

Reports.propTypes = {
  community: PropTypes.object.isRequired,
};

export default Reports;
