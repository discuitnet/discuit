create table if not exists badge_types (
	id int unsigned not null auto_increment,
    name varchar(64) not null,
	created_at datetime not null default current_timestamp(),

    primary key (id),
    unique (name)
);

create table if not exists user_badges (
	id bigint unsigned not null auto_increment,
    type int unsigned not null,
    user_id binary (12) not null,
	created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (type) references badge_types(id),
    foreign key (user_id) references users(id),
    index (user_id)
);