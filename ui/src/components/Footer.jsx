import React from 'react';
import Link from '../components/Link';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-col footer-show">
          <Link to="/" className="footer-logo">
            {CONFIG.siteName}
          </Link>
          <div className="footer-description">Better discussions on the internet.</div>
        </div>
        <div className="footer-col">
          <div className="footer-title">Organization</div>
          <Link to="/about" className="footer-item">
            About
          </Link>
          <a href={`mailto:${CONFIG.emailContact}`} className="footer-item">
            Contact
          </a>
        </div>
        <div className="footer-col">
          <div className="footer-title">Social</div>
          {CONFIG.twitterURL && (
            <a
              href={CONFIG.twitterURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
            >
              Twitter / X
            </a>
          )}
          {CONFIG.substackURL && (
            <a
              href={CONFIG.substackURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
            >
              Blog
            </a>
          )}
          {CONFIG.facebookURL && (
            <a
              href={CONFIG.facebookURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
            >
              Facebook
            </a>
          )}
          {CONFIG.instagramURL && (
            <a
              href={CONFIG.instagramURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
            >
              Instagram
            </a>
          )}
          {CONFIG.discordURL && (
            <a
              href={CONFIG.discordURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
            >
              Discord
            </a>
          )}
          {CONFIG.githubURL && (
            <a
              href={CONFIG.githubURL}
              className="footer-item"
              target="_blank"
              re="noopener"
              rel="noreferrer"
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
            re="noopener"
            rel="noreferrer"
          >
            Documentation
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
