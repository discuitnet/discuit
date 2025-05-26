import { useState } from 'react';
import Link from '../components/Link';
import StaticPage from '../components/StaticPage';

const About = () => {
  const faqItems = [
    {
      question: 'How does Discuit make money?',
      answer: (
        <>
          {'We don’t. Discuit is funded entirely through donations from our users via our '}
          <a href="https://www.patreon.com/discuit" target="_blank" rel="noreferrer">
            Patreon
          </a>
          .
        </>
      ),
    },
    {
      question: 'Would a non-profit social platform work at scale?',
      answer: `
        We do not know if all types of social platforms can have their non-profit
        alternatives—a non-profit alternative to Youtube probably won’t work, as
        hosting video is highly expensive—but we’re quite confident that Discuit can
        scale into millions of users just fine as a non-profit.  Hosting text is
        extremely cheap; images are not too costly either; it’s video that is
        expensive, and Discuit does not, nor do we plan to, have native video uploads.
      `,
    },
    {
      question: 'Is Discuit a federated platform?',
      answer: (
        <>
          {`Discuit is not a federated social platform, and we do not plan to support
            federation in the future either. This is because we do not believe that
            federated platforms, for a few specific reasons, have a chance of becoming
            mainstream social platforms one day.`}
        </>
      ),
    },
    {
      question: 'Does Discuit have a mobile app?',
      answer: (
        <>
          {`At the moment, Discuit does not have an official iOS or Android app. But we do
            have an official Progressive Web App (PWA) that can be installed on both iOS
            and Android devices (with support for device notifications). We also have two
            actively maintained third party apps developed by two of our users: `}
          <Link to="/DiscoApp">Disco</Link> for iOS, and <Link to="/Diskette">Diskette</Link> for
          Android.
        </>
      ),
    },
    {
      question: 'How can I contact someone at Discuit?',
      answer: (
        <>
          You can send an email to{' '}
          <a href={`mailto:${import.meta.env.VITE_EMAILCONTACT}`}>
            {import.meta.env.VITE_EMAILCONTACT}
          </a>
          , or join our <a href={import.meta.env.VITE_DISCORDURL}>Discord server </a>
          (after you join, create a ticket to contact an admin).
        </>
      ),
    },
    {
      question: 'I have feedback, bug reports, or questions. What should I do?',
      answer: (
        <>
          {`If you have a question about Discuit that’s not addressed here, feel free to
        ask it in the `}
          <Link to="/DiscuitMeta">DiscuitMeta</Link>
          {` community. If you have feedback or would like to report a bug, you can create a post in the `}
          <Link to="/DiscuitSuggestions">DiscuitSuggestions</Link>
          {` community (if you have a GitHub account, however, the best place to report a bug would be on `}
          <a href={`${import.meta.env.VITE_GITHUBURL}/issues`}>GitHub</a>
          {`)`}.
        </>
      ),
    },
  ];
  const [faqItemOpenedIndex, _setFaqItemOpenedIndex] = useState<number | null>(null);
  const setFaqItemOpenedIndex = (index: number) => {
    _setFaqItemOpenedIndex((value) => {
      if (value === index) return null;
      return index;
    });
  };

  const renderFaqItems = () => {
    const elems = faqItems.map((item, index) => {
      const { question, answer } = item;
      const isOpen = faqItemOpenedIndex === index;
      return (
        <div className={'about-faq-item' + (isOpen ? ' is-open' : '')} key={index}>
          <div className="about-faq-question" onClick={() => setFaqItemOpenedIndex(index)}>
            <span>{question}</span>
            <svg
              width="19"
              height="10"
              viewBox="0 0 19 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M1 1L9.5 8L17.5 1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="about-faq-answer">{answer}</div>
        </div>
      );
    });
    return <>{elems}</>;
  };

  return (
    <StaticPage className="page-about" title="About" noWrap>
      <div className="about-landing">
        <div className="wrap">
          <h1 className="about-heading heading-highlight">
            A social platform by the users, for the users.
          </h1>
          <h2 className="about-subheading">
            Discuit is a non-profit, open-source community discussion platform. It’s an alternative
            to Reddit.
          </h2>
        </div>
        <div className="squiggly-line"></div>
      </div>
      <div className="about-rest">
        <div className="wrap">
          <div className="about-section about-mission">
            <p>
              Our mission is to build the first large-scale social media platform where the
              interests of the platform are aligned with the interests of the user—a platform, in
              other words, that’s built on principles of ethical design. At the heart of these
              principles is the idea of giving users the freedom to choose their online social
              experience as they would prefer.
            </p>
            <p>
              Social media platforms have hitherto done the opposite and taken away what little
              control the users had, as it served those companies’ own self-interest, which was and
              still remains, to make as much money as possible, without any regard for, indeed to
              the utter detriment of, the well-being of the user.
            </p>
            {/*<p>
              {`For more information, see the article: `}
              <a href="https://discuit.substack.com" target="_blank" rel="noreferrer">
                {`Why we're building an alternative to Reddit.`}
              </a>
            </p>*/}
          </div>
          <div className="about-section about-highlights">
            <div className="about-highlight">
              <span className="is-bold">No ads. No tracking.</span>
              There are no ads, no forms of affiliate marketing, and no tracking anywhere on
              Discuit. And neither your attention, nor your data, is monetized in any way, shape or
              form.
            </div>
            <div className="about-highlight">
              <span className="is-bold">Enshitification-proof.</span>
              {`Discuit is a non-profit that's funded entirely by its users through donations. The
              lack of a profit motive—and the lack of any shareholders or investors to answer to—is
              essential in keeping this platform completely aligned with the interests and the
              well-being of its users.`}
            </div>
            <div className="about-highlight">
              <span className="is-bold">Giving agency to users.</span>
              Choice over what appears on your feed. Multiple feeds. A plethora of ways to filter
              content. In short, you have complete control over what you see on Discuit. (Please
              note that Discuit is a work in progress and that many of these features are yet to be
              built.)
            </div>
            <div className="about-highlight">
              <span className="is-bold">No dark patterns.</span>
              On Discuit, there are no nagging popups asking you to sign up. You don’t need an
              account to simply view a page. Images, in their highest quality, can be freely
              downloaded. We don’t manipulate you into using our platform more than you desire to.
            </div>
          </div>
          <div className="about-section about-faq">
            <div className="about-faq-title">Frequently asked questions</div>
            <div className="about-faq-list">{renderFaqItems()}</div>
          </div>
        </div>
      </div>
    </StaticPage>
  );
};

export default About;
