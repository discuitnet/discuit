alter table users add column upvote_notifications_off bool not null default false;

alter table users add column reply_notifications_off bool not null default  false;

alter table users add column home_feed int not null default 0;

alter table users add column default_feed_sort int not null default 0;
