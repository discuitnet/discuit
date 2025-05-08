alter table post_votes add column is_user_new boolean not null default false;
alter table comment_votes add column is_user_new boolean not null default false;
