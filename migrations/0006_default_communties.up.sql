create table if not exists default_communities (
	id int unsigned not null auto_increment,
	name_lc varchar (128) not null,

	primary key (id),
	unique (name_lc),
	foreign key (name_lc) references communities (name_lc)
);

insert into default_communities (name_lc) select name_lc from communities where deleted_at is null;
