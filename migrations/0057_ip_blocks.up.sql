create table if not exists ipblocks {
    id int unsigned not null auto_increment,
    ip inet6 not null,
    masked_bits tinyint unsigned not null default 0,
	created_at datetime not null default current_timestamp(),
    created_by varbinary (12) not null,
    expires_at datetime,
    cancelled_at datetime,
    in_effect bool not null default true,
    associated_users JSON,
    note TEXT,

    primary key (id),
	foreign key (created_by) references users (id),
}
