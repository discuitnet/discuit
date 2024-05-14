import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Link from '../../components/Link';
import Dropdown from '../../components/Dropdown';

const Lists = () => {
  const { username } = useParams();

  useEffect(() => {
    document.body.classList.add('is-not-gray');
    return () => {
      document.body.classList.remove('is-not-gray');
    };
  }, []);

  return (
    <div className="page-content wrap page-grid page-lists">
      <Sidebar />
      <main>
        <div className="lists-head">
          <h1>
            <Link to={`/@${username}`}>@{username}</Link>
            {"'s lists"}
          </h1>
        </div>
        <section className="lists-main">
          <div className="lists-main-head">
            <div className="left">
              <Dropdown target="Last added">
                <div className="dropdown-list">
                  <div className="dropdown-item">Last added</div>
                  <div className="dropdown-item">A-Z</div>
                </div>
              </Dropdown>
              <Dropdown target="All">
                <div className="dropdown-list">
                  <div className="dropdown-item">Public</div>
                  <div className="dropdown-item">Private</div>
                  <div className="dropdown-item">All</div>
                </div>
              </Dropdown>
            </div>
          </div>
          <div className="lists-main-main">
            <ListThumbnail />
            <ListThumbnail />
            <ListThumbnail />
            <ListThumbnail />
            <ListThumbnail />
            <ListThumbnail />
            <ListThumbnail />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Lists;

const ListThumbnail = ({ list }) => {
  // TODO: Display list private status.
  return (
    <Link className="list-thumb" to="/@user/lists/favorites">
      <div className="list-thumb-top">
        <div className="list-thumb-image">
          <img
            src="https://discuit.net/images/17cad58e3fb9872ece91fc87.jpeg?sig=hgUa8EBH96UoIW4YsR5qASk36arQsP_iELgJmV18QBw"
            alt="Cutest little doggie"
          />
        </div>
      </div>
      <div className="list-thumb-bottom">
        <div className="list-thumb-name">
          <span className="is-name">Favorites</span>
          <span className="is-age">1d</span>
        </div>
        <div className="list-thumb-count">125 items</div>
      </div>
    </Link>
  );
};

ListThumbnail.propTypes = {
  list: PropTypes.object.isRequired,
};
