alter table users add column welcome_notification_sent bool not null default false;
alter table users add index idx_welcome_notification_sent (welcome_notification_sent);

/* Consider the notification is sent for users older than 7 days. */
update users set welcome_notification_sent = 1 where created_at < subdate(now(), 7);