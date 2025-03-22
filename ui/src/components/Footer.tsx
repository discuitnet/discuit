import { useEffect } from 'react';
import Link from './Link';

const Footer = () => {
  const className = 'footer';

  // For some reason, on Firefox desktop, there's a small (2 pixels perhaps)
  // white bar on the bottom of the page. This useEffect hook gets rid of that
  // by making it the background color of the footer.
  useEffect(() => {
    const footerEl = document.querySelector(className);
    if (footerEl) {
      const background = document.documentElement.style.background;
      document.documentElement.style.background = window.getComputedStyle(footerEl).background;
      return () => {
        document.documentElement.style.background = background;
      };
    }
  }, []);

  return (
    <footer className={className}>
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
          <Link className="footer-item" to="/guidelines">
            Site guidelines
          </Link>
          <Link className="footer-item" to="/moderator-guidelines">
            Moderator guidelines
          </Link>
          <Link className="footer-item" to="/terms">
            Terms
          </Link>
          <Link className="footer-item" to="/privacy-policy">
            Privacy
          </Link>
          <a
            className="footer-item"
            href="https://docs.discuit.org/"
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
