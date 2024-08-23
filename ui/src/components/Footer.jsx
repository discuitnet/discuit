import React from 'react';
import Link from '../components/Link';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-col footer-show">
          <Link to="/" className="footer-logo">
            {import.meta.env.VITE_SITENAME}
          </Link>
          <div className="footer-description">Better discussions on the internet.</div>
        </div>
        <div className="footer-col">
          <div className="footer-title">Organization</div>
          <Link to="/about" className="footer-item">
            About
          </Link>
          <a href={`mailto:${import.meta.env.VITE_EMAILCONTACT}`} className="footer-item">
            Contact
          </a>
        </div>
        <div className="footer-col">
          <div className="footer-title">Social</div>
          {import.meta.env.VITE_TWITTERURL && (
            <a
              href={import.meta.env.VITE_TWITTERURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Twitter / X
            </a>
          )}
          {import.meta.env.VITE_SUBSTACKURL && (
            <a
              href={import.meta.env.VITE_SUBSTACKURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Blog
            </a>
          )}
          {import.meta.env.VITE_FACEBOOKURL && (
            <a
              href={import.meta.env.VITE_FACEBOOKURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Facebook
            </a>
          )}
          {import.meta.env.VITE_INSTAGRAMURL && (
            <a
              href={import.meta.env.VITE_INSTAGRAMURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Instagram
            </a>
          )}
          {import.meta.env.VITE_DISCORDURL && (
            <a
              href={import.meta.env.VITE_DISCORDURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Discord
            </a>
          )}
          {import.meta.env.VITE_GITHUBURL && (
            <a
              href={import.meta.env.VITE_GITHUBURL}
              className="footer-item"
              target="_blank"
              rel="noopener"
            >
              Github
            </a>
          )}
        </div>
        <div className="footer-col">
          <div className="footer-title">Policies</div>
          <Link className="footer-item" to="/terms">
            Terms
          </Link>
          <Link className="footer-item" to="/privacy-policy">
            Privacy
          </Link>
          <Link className="footer-item" to="guidelines">
            Guidelines
          </Link>
          <a
            className="footer-item"
            href="https://docs.discuit.net/"
            target="_blank"
            rel="noopener"
          >
            Documentation
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
