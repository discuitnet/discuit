import Favicon from '../../assets/imgs/favicon.png';
import { selectImageCopyURL, stringCount } from '../../helper';
import { badgeImage } from '../../pages/User/badgeImage';
import {
  Community,
  Notification,
  NotificationCommentReply,
  NotificationModAdd,
  NotificationNewBadge,
  NotificationNewComment,
  NotificationNewVotes,
  NotificationPostDeleted,
  NotificationWelcome,
  Post,
} from '../../serverTypes';

export function getNotificationDisplayInformation(
  notification: Notification,
  html = false
): { text: string; to: string; image: { url: string; backgroundColor: string } } {
  const tag = (tag: string): string => {
    if (html) {
      return tag;
    }
    return '';
  };

  const defaultImage = { url: Favicon, backgroundColor: '#3d3d3d' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getNotifImage = (notif: any) => {
    let image = Favicon,
      background = '#3d3d3d';
    const post = notif.post as Post;
    if (post) {
      switch (post.type) {
        case 'image':
          if (post.image) {
            image = selectImageCopyURL('tiny', post.image);
            background = notif.post.image.averageColor;
          }
          break;
        case 'link':
          if (post.link && post.link.image) {
            image = selectImageCopyURL('tiny', post.link.image);
            background = post.link.image.averageColor;
          }
          break;
      }
    } else {
      const community = notif.community as Community;
      if (typeof community === 'object' && community !== null) {
        if (community.proPic) {
          image = selectImageCopyURL('small', community.proPic);
          background = community.proPic.averageColor;
        }
      }
    }
    return { url: image, backgroundColor: background };
  };

  let text = '',
    to = '',
    image = defaultImage;
  switch (notification.type) {
    case 'new_comment':
      {
        const notif = notification.notif as NotificationNewComment;
        to = `/${notif.post.communityName}/post/${notif.post.publicId}`;
        if (notif.noComments === 1) {
          text = `${tag('<b>')}@${notif.commentAuthor}${tag('</b>')} commented on your post ${tag('<b>')}${notif.post.title}${tag('</b>')}`;
          to += `/${notif.commentId}`;
        } else {
          text = `${notif.noComments} new comments on your post ${tag('<b>')}${notif.post.title}${tag('</b>')}`;
          to += `?notifId=${notification.id}`;
        }
        image = getNotifImage(notif);
      }
      break;
    case 'comment_reply':
      {
        const notif = notification.notif as NotificationCommentReply;
        to = `/${notif.post.communityName}/post/${notif.post.publicId}`;
        if (notif.noComments === 1) {
          text = `${tag('<b>')}@${notif.commentAuthor}${tag('</b>')} replied to your comment on post ${tag('<b>')}${notif.post.title}${tag('</b>')}`;
          to += `/${notif.commentId}`;
        } else {
          text = `${notif.noComments} new replies to your comment on post ${tag('<b>')}${notif.post.title}${tag('</b>')}`;
          to += `?notifId=${notification.id}`;
        }
        image = getNotifImage(notif);
      }
      break;
    case 'new_votes':
      {
        const notif = notification.notif as NotificationNewVotes;
        if (notif.targetType === 'post') {
          text = `${stringCount(notif.noVotes, false, 'new upvote')} on your post ${tag('<b>')}${notif.post?.title}${tag('</b>')}`;
          to = `/${notif.post?.communityName}/post/${notif.post?.publicId}`;
        } else {
          text = `${stringCount(notif.noVotes, false, 'new vote')} on your comment in ${tag('<b>')}${notif.post?.title}${tag('</b>')}`;
          to = `/${notif.comment?.communityName}/post/${notif.comment?.postPublicId}/${notif.comment?.id}`;
        }
        image = getNotifImage(notif);
      }
      break;
    case 'deleted_post':
      {
        const notif = notification.notif as NotificationPostDeleted;
        to = `/${notif.post?.communityName}/post/${notif.post?.publicId}`;
        const part =
          notif.deletedAs === 'mods'
            ? `moderators of ${tag('<b>')}${notif.post?.communityName}${tag('</b>')}`
            : 'the admins';
        text = `Your post ${tag('<b>')}${notif.post?.title}${tag('</b>')} has been removed by ${part}`;
        image = getNotifImage(notif);
      }
      break;
    case 'mod_add':
      {
        const notif = notification.notif as NotificationModAdd;
        to = `/${notif.communityName}`;
        text = `You are added as a moderator of ${tag('<b>')}${notif.communityName}${tag('</b>')} by ${tag('<b>')}@${notif.addedBy}.${tag('</b>')}`;
        image = getNotifImage(notif);
      }
      break;
    case 'new_badge':
      {
        const notif = notification.notif as NotificationNewBadge;
        text = `You are awarded the ${tag('<b>')}supporter${tag('</b>')} badge for your contribution to Discuit and for sheer awesomeness!`;
        to = `/@${notif.user.username}`;
        const { src } = badgeImage(notif.badgeType);
        image = {
          url: src,
          backgroundColor: 'transparent',
        };
      }
      break;
    case 'welcome':
      {
        const notif = notification.notif as NotificationWelcome;
        text = `${tag('<b>')}Welcome to Discuit${tag('</b>')} Make a post in our ${tag('<b>')}${notif.community.name}${tag('</b>')} community to say hello!`;
        to = `/${notif.community.name}`;
        image = getNotifImage(notif);
      }
      break;
    default: {
      throw new Error(`unknown notification type: ${notification.type}`);
    }
  }

  return {
    text,
    to,
    image,
  };
}
