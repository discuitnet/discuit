import React from 'react';
import Link from '../components/Link';
import StaticPage from '../components/StaticPage';

const About = () => {
  return (
    <StaticPage className="page-about" title="About">
      <main className="document">
        <h1 className="highlight">Discuit is a discussion platform and a link aggregrator.</h1>
        <p>Please read the Welcome Post to know more about this website.</p>
        <p>
          Discuit was launched on June, 2023. I am <Link to="/@previnder">@previnder</Link>, and you
          can contact me at{' '}
          <a href={`mailto:${CONFIG.emailContact}`} className="footer-item">
            {CONFIG.emailContact}
          </a>
          .
        </p>
      </main>
    </StaticPage>
  );
};

export default About;
