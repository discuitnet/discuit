import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReportsView from './ReportsView';
import { useLoading, usePagination } from '../../hooks';
import { mfetchjson, timeAgo } from '../../helper';
import PostCard from '../../components/PostCard';
import { useDispatch } from 'react-redux';
import { snackAlertError } from '../../slices/mainSlice';
import Pagination from '../../components/Pagination';

const Removed = ({ community, filter, title }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useLoading();

  const limit = 10;
  const [page, setPage] = usePagination();
  const [noPosts, setNoPosts] = useState(0);
  const [posts, setPosts] = useState([]);
  const noPages = Math.ceil(noPosts / limit);

  useEffect(() => {
    (async () => {
      try {
        const json = await mfetchjson(
          `/api/posts?communityId=${community.id}&filter=${filter}&page=${page}&limit=${limit}`
        );
        setPosts(json.posts || []);
        setNoPosts(json.noPosts);
        setLoading('loaded');
      } catch (error) {
        setLoading('failed');
        dispatch(snackAlertError(error));
      }
    })();
  }, [community.id, filter, page, limit]);

  if (loading !== 'loaded') return null;

  return (
    <ReportsView title={`${title} (${noPosts})`}>
      <div className="modtools-reports-posts">
        {posts.map((post) => (
          <div key={post.id} className="card card-padding card-report">
            <div className="card-report-head">
              <div className="left"></div>
              <div className="right">{timeAgo(post.createdAt)}</div>
            </div>
            <div className="card-report-item">
              <PostCard initialPost={post} compact inModTools />
            </div>
          </div>
        ))}
      </div>
      <Pagination noPages={noPages} onClick={(next) => setPage(next)} current={page} />
    </ReportsView>
  );
};

Removed.propTypes = {
  community: PropTypes.object.isRequired,
  filter: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

export default Removed;
