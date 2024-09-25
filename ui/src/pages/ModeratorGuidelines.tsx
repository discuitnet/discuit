import { Link } from 'react-router-dom';
import StaticPage from '../components/StaticPage';

const ModeratorGuidelines = () => {
  return (
    <StaticPage className="page-guidelines" title="Guidelines">
      <main className="document">
        <h1>Discuit moderator guidelines</h1>
        <p>
          Moderators are entrusted with a lot of power and responsibility within the Discuit
          communities they serve. Moderators are granted the ability to remove user posts and
          comments, ban users, and put in place additional community specific rules for users to
          follow. These entrusted powers are necessary for moderators to help foster positive
          engagement in our communities.
        </p>
        <h2>Properly set up and maintain the community</h2>
        <p>
          Moderators are responsible for setting up their communities properly. This includes
          writing an appropriate short description of the community; setting community profile and
          banner images; and creating additional clear and concise community rules for users to
          follow. Optionally, this can include, especially in the beginning, seeding the community
          with content, so any visitors are not met with an empty page.
        </p>
        <h2>Uphold site guidelines</h2>
        <p>
          Discuit moderators are expected to follow and uphold Discuit’s{` `}
          <Link to="/guidelines">site guidelines.</Link> Any user content in violation of Discuit’s
          site guidelines should be promptly dealt with. If a user severely or repeatedly is in
          violation of Discuit’s site guidelines, moderators are responsible for escalating these
          violations to the admin team for further action.
        </p>
        <h2>Be active and engaged</h2>
        <p>
          Moderators are responsible for actively moderating their communities and not leave then
          unattended. Reports should be handled in a timely manner. This doesn’t, of course, mean
          moderators must be constantly online—real life should always come first. Depending on the
          size and engagement of the community, there should be enough moderators to help resolve
          any issues or user questions. In cases where a moderator is unavailable for a community
          issue, the admin team will handle responsibility based on community and site rules.
        </p>
        <p>
          In the event a moderator wishes to step down or needs to leave, the moderator should make
          every effort, if possible, to find a suitable replacement as well as alerting the admin
          team to the situation.
        </p>
        <p>
          The best way to recruit new moderators is to invite active members of the community for
          the mod role. You know who these users are and you know their history. It should also be
          mentioned if someone’s too eager to be a moderator, they probably shouldn’t be a
          moderator.
        </p>
        <h2>Be fair in the enforcement of community rules</h2>
        <p>
          Community rules must apply equally to all users. Moderators should serve as an example to
          all users of the communities they serve. Moderators are not to:
        </p>
        <ul>
          <li>Remove content or ban users because of personal disagreements or dislikes.</li>
          <li>
            Ban users without justification (without users violating site guidelines or community
            rules, for example).
          </li>
          <li>Ban users based on participation in other Discuit communities.</li>
        </ul>
        <p>
          User repercussions for violations of community rules should be proportional to the
          severity of the user violation. For minor offenses, users should receive a friendly
          warning first and any further action should only be taken if the user does not heed the
          warning. Permanent community bans are reserved for major offenses or users who do not
          change their behavior after multiple warnings or any temporary time-outs. Users believing
          they were unfairly banned from a community have the option to appeal the ban to a member
          of the admin team.
        </p>
        <h2>Be calm and level-headed</h2>
        <p>
          Moderators are expected to be calm and level-headed as much as possible. For example, when
          a user is reprimanded for violating Discuit community or site rules—either by removing
          their post or comment, or by giving them a time-out—users can become upset and may
          sometimes reply back with frustration and impatience. Most of the time this is just the
          user venting. Most users only want to be heard. In these situations simply and kindly
          point out what they did wrong (which rule they broke, for example), and avoid escalation
          by using aggressive or derogatory language.
        </p>
        <p>
          The Discuit admin team has the authority to remove any moderator for abuse of power, or,
          if there is proof of a moderator being unable or unwilling to uphold their entrusted
          powers and responsibilities of the community they serve.
        </p>
        <h2>Let the user know what they did wrong</h2>
        <p>
          Except for the most serious offenders (trolls and spammers, for example), moderators
          should inform the user of what rule they violated by replying to the post or comment that
          was in violation. This gives the user an opportunity to correct their behavior in the
          future.
        </p>
        <h2>Be kind</h2>
        <p>
          Please remember to be kind. Though we only see a username and an avatar on Discuit, always
          keep in mind that on the other side of the interaction is another human being.
        </p>
      </main>
    </StaticPage>
  );
};

export default ModeratorGuidelines;
