alter table posts add column last_activity_at datetime not null default current_timestamp();

alter table posts add index last_activity_at (deleted, last_activity_at);

alter table posts add index last_activity_at_2 (community_id, deleted, last_activity_at);

update posts set last_activity_at = ifnull((select comments.created_at from comments where post_id = posts.id order by comments.created_at desc limit 1), posts.created_at);
