create table if not exists analytics (
    id bigint unsigned not null auto_increment,
    event_name varchar (255) not null,
    unique_key binary (16), /* md5 hash */
    payload text,
	created_at datetime not null default current_timestamp(),

    primary key (id),
    index (event_name, created_at),
    unique (unique_key),
    index (created_at)
);