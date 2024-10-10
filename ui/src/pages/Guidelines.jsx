import StaticPage from '../components/StaticPage';

const Guidelines = () => {
  return (
    <StaticPage className="page-guidelines" title="Guidelines">
      <main className="document">
        <h1>Discuit site guidelines</h1>
        <p>
          For the purpose of keeping this place civil and friendly, Discuit will have certain
          restrictions on what is and isn't allowed on this platform. But these restrictions will
          still allow a wide rage of opinions and different communities to exist. We have no desire
          to moderate people's opinions or censor dissenting views. We enjoy good-faith, respectful
          discussions on (sometimes controversial) subjects with people whose opinions differ. After
          all, no one learns anything if they only talk to people that always agree with them.
        </p>
        <p>
          Discuit, being a forum of forums, will naturally have two levels of moderation: site-wide
          and community-wide. Community-wide rules are for each community to make and they can be as
          strict or as lax as they please, so long as they adhere to the site-wide rules.
        </p>
        <h2>Site-wide rules:</h2>
        <ol>
          <li>
            <strong>No spam.</strong> Sharing anything you've created or done on Discuit is
            completely fine but please don't repeatedly share the same link or submit to irrelevant
            communities. And don't use Discuit solely for self-promotion.
          </li>
          <li>
            <strong>No porn.</strong> Please don't post anything with sexually explicit material,
            including nudity and depictions of sexual acts.
          </li>
          <li>
            <p>
              <strong>No racism or hate.</strong> Don't post anything that promotes violence or
              discrimination against a group of people based on race, ethnicity, sex, gender,
              religion, nationality, or sexual orientation.
            </p>
            <p>
              Respectfully talking about, for example, racial or national differences, is okay.
              Joking about, say, different cultural idiosyncrasies is also okay, provided that it's
              not coming from a place of hatred.
            </p>
            <p>
              The use of racial slurs, on the other hand, is not okay; nor is promoting the idea
              that a particular race is superior or inferior to all others. Criticism is okay,
              hatred is not.
            </p>
          </li>
          <li>
            <strong>No harassment of other users.</strong> Disagreements are normal and expected,
            but attempts to shutdown discourse, name calling, repetitive comments, threatening
            people, and organizing campaigns of harassment are not allowed.
          </li>
          <li>
            <strong>No doxing.</strong> Don't share someone else's private information (such as
            their phone number or address) without their explicit consent. And don't threaten to do
            so either.
          </li>
          <li>
            <strong>No encouraging harmful behavior.</strong> Don't post anything that encourages
            harmful behavior, like suicide or self-harm.
          </li>
          <li>
            <strong>No brigading.</strong> Don't organize campaigns to 1) downvote posts and
            comments of a community you don't like or 2) to leave hostile posts and comments in a
            community you don't like. If you don't like the rules of a particular community or how
            it moderates content, you can create a new community as <i>you</i> like.
          </li>
        </ol>
        <p>
          Breaking these rules may result in the offending material being removed and/or temporary
          or permanent suspension of the user accounts involved.
        </p>
        <p>
          Discuit is a work in progress, and these rules are not set in stone. They may change in
          the future as we gain more experience.
        </p>
      </main>
    </StaticPage>
  );
};

export default Guidelines;
