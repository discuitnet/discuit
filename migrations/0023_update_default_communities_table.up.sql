alter table default_communities add column community_id binary(12) not null;

update default_communities set community_id = (select communities.id from communities where communities.name_lc = default_communities.name_lc);

alter table default_communities add constraint fk_community_id foreign key (community_id) references communities (id);