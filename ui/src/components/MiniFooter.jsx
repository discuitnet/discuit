import React from 'react';
import Link from '../components/Link';

const MiniFooter = () => {
  return (
    <footer className="mini-footer">
      <Link to="/about">About</Link>
      <Link to="/terms">Terms</Link>
      <Link to="/privacy-policy">Privacy</Link>
      <Link to="/guidelines">Guidelines</Link>
      <a href="https://docs.discuit.net/" target="_blank" rel="noopener">
        Docs
      </a>
      <a href={`mailto:${import.meta.env.VITE_EMAILCONTACT}`}>Contact</a>
      <span>© 2024 {import.meta.env.VITE_SITENAME}.</span>
    </footer>
  );
};

export default MiniFooter;
