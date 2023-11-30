create table if not exists community_rules (
	id int unsigned not null auto_increment,
	rule varchar(255) not null,
	description varchar(1024),
	community_id binary (12) not null,
	created_by binary (12) not null,
	z_index int not null default 0,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (community_id) references communities (id),
	foreign key (created_by) references users (id)
);
