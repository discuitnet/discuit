create table if not exists community_requests (
    id int not null auto_increment,
    by_user varchar (20) not null,
    community_name varchar (128) not null,
    community_name_lc varchar (128) not null,
    note text,

	created_at datetime not null default current_timestamp(),
	deleted_at datetime,

    primary key (id),
    unique (by_user, community_name_lc)
);