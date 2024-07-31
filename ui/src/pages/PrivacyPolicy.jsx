import React from 'react';
import StaticPage from '../components/StaticPage';

const PrivacyPolicy = () => {
  return (
    <StaticPage className="" title="Privacy Policy">
      <main className="document">
        <h1>Privacy Policy</h1>
        <h2>What information we collect</h2>
        <p>
          To make your experience using {import.meta.env.VITE_SITENAME} better, we collect
          information from your interactions with our website.
        </p>
        <p>Information we collect from all visitors to our website includes:</p>
        <ul>
          <li>Visitors IP address.</li>
          <li>Information about the visitors browser (type, version, etc).</li>
          <li>Timestamps of network requests.</li>
        </ul>
        <h2>What we do with your information</h2>
        <p>
          Some of this information is neccessary for the website to work, and some improve existing
          functionality and provide insight into future improvements, and some are neccessary for
          security reasons like combating malicious user activity.
        </p>
        <h2>Changes to this policy</h2>
        <p>We reserve the right to revise this Privacy Policy at any time.</p>
      </main>
    </StaticPage>
  );
};

export default PrivacyPolicy;
