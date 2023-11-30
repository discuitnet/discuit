alter table posts_today drop column user_id;
alter table posts_week drop column user_id;
alter table posts_month drop column user_id;
alter table posts_year drop column user_id;

drop table muted_users;
drop table muted_communities;