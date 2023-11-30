alter table pinned_site add column community_id binary (12);

alter table pinned_site drop foreign key pinned_site_ibfk_1;

alter table pinned_site drop index post_id;

alter table pinned_site add constraint pinned_site_fk_community_id foreign key (community_id) references communities (id);

alter table pinned_site add constraint pinned_site_fk_post_id foreign key (post_id) references posts (id);

alter table pinned_site add column is_site_wide bool not null;

alter table pinned_site add unique unique_pin (is_site_wide, post_id);

alter table pinned_site add index community_id_post_id (community_id, post_id);

alter table pinned_site rename pinned_posts;

alter table posts add column is_pinned bool not null default false;

update posts set is_pinned = is_pinned_site;