alter table posts drop column is_pinned;

alter table pinned_posts rename pinned_site;

alter table pinned_site drop foreign key pinned_site_fk_post_id;

alter table pinned_site drop foreign key pinned_site_fk_community_id;

alter table pinned_site drop index community_id_post_id;

alter table pinned_site drop index unique_pin;

alter table pinned_site drop column is_site_wide;

alter table pinned_site add index (post_id);

alter table pinned_site add foreign key (post_id) references posts (id);

alter table pinned_site drop column community_id;
