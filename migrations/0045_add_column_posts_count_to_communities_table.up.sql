alter table communities add column posts_count int not null default 0;
update communities set posts_count = (select count(*) from posts where community_id = communities.id);

alter table community_members drop constraint community_members_ibfk_1;
alter table community_members add constraint community_members_ibfk_1 foreign key (community_id) references communities (id) on delete cascade;

alter table community_banned drop constraint community_banned_ibfk_1;
alter table community_banned add constraint community_banned_ibfk_1 foreign key (community_id) references communities (id) on delete cascade;

alter table community_mods drop constraint community_mods_ibfk_1;
alter table community_mods add constraint community_mods_ibfk_1 foreign key (community_id) references communities (id) on delete cascade;

alter table community_rules drop constraint community_rules_ibfk_1;
alter table community_rules add constraint community_rules_ibfk_1 foreign key (community_id) references communities (id) on delete cascade;

alter table default_communities drop constraint default_communities_ibfk_1;
alter table default_communities add constraint default_communities_ibfk_1 foreign key (name_lc) references communities (name_lc) on update cascade on delete cascade;
alter table default_communities drop constraint fk_community_id;
alter table default_communities add constraint fk_community_id foreign key (community_id) references communities (id) on delete cascade;

alter table muted_communities drop constraint muted_communities_ibfk_2;
alter table muted_communities add constraint muted_communities_ibfk_2 foreign key (community_id) references communities (id) on delete cascade;

alter table reports drop constraint reports_ibfk_1;
alter table reports add constraint reports_ibfk_1 foreign key (community_id) references communities (id) on delete cascade;
