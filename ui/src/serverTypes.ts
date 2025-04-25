export interface User {
  id: string;
  username: string;
  email: string | null;
  emailConfirmedAt: string | null; // A datetime.
  aboutMe: string | null;
  points: number;
  isAdmin: boolean;
  proPic: Image | null;
  badges: Badge[] | null;
  noPosts: number;
  noComments: number;
  lastSeenMonth: string; // of the form: November 2024
  createdAt: string; // A datetime.
  deleted: boolean;
  deletedAt: string | null; // A datetime.
  upvoteNotificationsOff: boolean;
  replyNotificationsOff: boolean;
  homeFeed: 'all' | 'subscriptions';
  rememberFeedSort: boolean;
  embedsOff: boolean;
  hideUserProfilePictures: boolean;
  bannedAt: string | null; // A datetime.
  isBanned: boolean;
  notificationsNewCount: number;
  moddingList: Community[] | null;
}

export type UserGroup = 'normal' | 'admins' | 'mods';

export interface Image {
  id: string;
  format: 'jpeg' | 'webp' | 'png';
  mimetype: string;
  width: number;
  height: number;
  size: number;
  averageColor: string;
  url: string;
  copies: ImageCopy[] | null;
  altText: string | null;
}

export interface ImageCopy {
  name?: string;
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
  fit: 'cover' | 'contain';
  format: 'jpeg' | 'webp' | 'png';
  url: string;
}

export interface Badge {
  id: number;
  type: string;
}

export interface Community {
  id: string;
  userId: string;
  name: string;
  nsfw: boolean;
  about: string | null;
  noMembers: number;
  proPic: Image | null;
  bannerImage: Image | null;
  postingRestricted: boolean;
  createdAt: string; // A datetime.
  isDefault?: boolean;
  userJoined: boolean | null;
  userMod: boolean | null;
  isMuted: boolean;
  mods: User[] | null;
  rules: CommunityRule[] | null;
  ReportsDetails: {
    noReports: number;
    noPostReports: number;
    noCommentReports: number;
  };
}

export interface CommunityRule {
  id: number;
  rule: string;
  description: string | null;
  communityId: string;
  zIndex: number;
  createdBy: string;
  createdA: string; // A datetime.
}

export interface Post {
  id: string;
  type: 'text' | 'image' | 'link';
  publicId: string;
  userId: string;
  username: string;
  userGhostId?: string;
  userGroup: UserGroup;
  userDeleted: boolean;
  isPinned: boolean;
  isPinnedSite: boolean;
  communityId: string;
  communityName: string;
  communityProPic?: Image;
  communityBannerImage?: Image;
  title: string;
  body: string | null;
  image?: Image;
  images?: Image[];
  link?: {
    url: string;
    hostname: string;
    image?: Image;
  };
  locked: boolean;
  lockedBy: string | null;
  lockedAs?: UserGroup;
  lockedAt: string | null; // A datetime.
  upvotes: number;
  downvotes: number;
  hotness: number;
  createdAt: string; // A datetime.
  editedAt: string | null; // A datetime.
  lastActivityAt: string; // A datetime.
  deleted: boolean;
  deletedAt?: string; // A datetime.
  deletedAs?: UserGroup;
  deletedContent: boolean;
  deletedContentAs?: UserGroup;
  noComments: number;
  comments?: Comment[] | null;
  commentsNext?: string | null;
  userVoted: boolean | null;
  userVotedUp: boolean | null;
  isAuthorMuted: boolean;
  isCommunityMuted: boolean;
  community?: Community;
  author?: User;
}

export interface Comment {
  id: string;
  postId: string;
  postPublicId: string;
  communityId: string;
  communityName: string;
  userId?: string;
  username: string;
  userGhostId?: string;
  userGroup: UserGroup;
  userDeleted: boolean;
  parentId: string | null;
  depth: number;
  noReplies: number;
  noRepliesDirect: number;
  ancestors: string[]; // From root to parent.
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string; // A datetime.
  editedAt: string | null; // A datetime.
  contentStripped?: boolean;
  deleted: boolean;
  deletedAt: string | null; // A datetime.
  deletedAs?: UserGroup;
  author?: User;
  isAuthorMuted?: boolean;
  userVoted: boolean | null;
  userVotedUp: boolean | null;
  postTitle?: string;
  postDeleted: boolean;
  postDeletedAs?: UserGroup;
}

export type ListSort = 'addedDsc' | 'addedAsc' | 'createdDsc' | 'createdAsc';

export interface List {
  id: number;
  userId: string;
  username: string;
  name: string;
  displayName: string;
  description: string | null;
  public: boolean;
  numItems: number;
  sort: ListSort;
  createdAt: string; // A datetime.
  lastUpdatedAt: string; // A datetime.
}

export type NotificationType =
  | 'new_comment'
  | 'comment_reply'
  | 'new_votes'
  | 'deleted_post'
  | 'mod_add'
  | 'new_badge'
  | 'welcome'
  | 'announcement';

export interface Notification {
  id: number;
  type: NotificationType;
  notif:
    | null
    | NotificationNewComment
    | NotificationCommentReply
    | NotificationNewVotes
    | NotificationPostDeleted
    | NotificationModAdd
    | NotificationNewBadge
    | NotificationWelcome
    | NotificationAnnouncement;
  seen: boolean;
  seenAt: string | null; // A datetime.
  createdAt: string; // A datetime.
}

export interface NotificationNewComment {
  postId: string;
  commentId: string;
  noComments: number;
  commentAuthor: string;
  firstCreatedAt: string;
  post: Post;
}

export interface NotificationCommentReply {
  postId: string;
  parentCommentId: string;
  commentId: string;
  noComments: number;
  commentAuthor: string;
  firstCreatedAt: string;
  post: Post;
}

export interface NotificationNewVotes {
  targetType: 'post' | 'comment';
  targetId: string;
  noVotes: number;
  post?: Post;
  comment?: Comment;
}

export interface NotificationPostDeleted {
  targetType: 'post' | 'comment';
  targetId: string;
  deletedAs: UserGroup;
  post?: Post;
  comment?: Comment;
}

export interface NotificationModAdd {
  communityName: string;
  addedBy: string;
  community: Community;
}

export interface NotificationNewBadge {
  badgeType: string;
  user: User;
}

export interface NotificationWelcome {
  communityName: string;
  community: Community;
}

export interface NotificationAnnouncement {
  postId: string;
  post: Post;
  community: Community;
}

export interface Mute {
  id: string;
  type: 'user' | 'community';
  mutedUserId?: string;
  mutedCommunityId?: string;
  createdAt: string; // A datetime.
  mutedUser?: User;
  mutedCommunity?: Community;
}

export interface Mutes {
  userMutes: Mute[] | null;
  communityMutes: Mute[] | null;
}

export interface SiteSettings {
  signupsDisabled: boolean;
}

export interface AnalyticsEvent {
  id: number;
  name: string;
  uniqueKey: string | null;
  payload: string;
  createdAt: string; // A datetime.
}

export type CommunitiesSort = 'new' | 'old' | 'size' | 'name_asc' | 'name_dsc';
