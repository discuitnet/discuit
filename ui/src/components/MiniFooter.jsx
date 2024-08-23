import React from 'react';
import Link from '../components/Link';

const MiniFooter = () => {
  return (
    <footer className="mini-footer">
      <Link to="/about">About</Link>
      <Link to="/terms">Terms</Link>
      <Link to="/privacy-policy">Privacy</Link>
      <Link to="/guidelines">Guidelines</Link>
      <a href="https://docs.discuit.net/" target="_blank" re="noopener" rel="noreferrer">
        Docs
      </a>
      <a href={`mailto:${CONFIG.emailContact}`}>Contact</a>
      <span>© 2024 {CONFIG.siteName}.</span>
    </footer>
  );
};

export default MiniFooter;
