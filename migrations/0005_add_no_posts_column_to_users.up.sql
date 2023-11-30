alter table users add column no_posts int not null default 0;

update users set users.no_posts = (select count(*) from posts where posts.user_id = users.id and posts.deleted = false);

alter table users add column no_comments int not null default 0;

update users set users.no_comments = (select count(*) from comments where comments.user_id = users.id and comments.deleted_at is null);
