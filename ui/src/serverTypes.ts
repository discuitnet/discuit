export interface User {
  id: string;
  username: string;
  email?: string;

  emailConfirmedAt?: string; // A datetime.

  aboutMe?: string;
  points: number;
  isAdmin: boolean;
  proPic?: Image;
  badges?: Badge[];
  noPosts: number;
  noComments: number;
  createdAt: string; // A datetime.
  deleted: boolean;
  deletedAt?: string; // A datetime.
  upvoteNotificationsOff: boolean;
  replyNotificationsOff: boolean;
  homeFeed: 'all' | 'subscriptions';
  rememberFeedSort: boolean;
  embedsOff: boolean;
  hideUserProfilePictures: boolean;
  bannedAt?: string; // A datetime.
  isBanned: boolean;
  notificationsNewCount: number;
  moddingList?: Community[];
}

export interface Image {
  id: string;
  format: 'jpeg' | 'webp' | 'png';
  mimetype: string;
  width: number;
  height: number;
  size: number;
  averageColor: string;
  url: string;
  copies?: ImageCopy[];
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
  temp: unknown; // Gets rid of linter error
}
