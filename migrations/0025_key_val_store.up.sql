create table if not exists application_data (
    `key` varchar (255) not null,
    `value` text,
	created_at datetime not null default current_timestamp(),

    primary key (`key`)
);
