create table if not exists notifications (
    id bigint not null auto_increment,
    user_id binary (12) not null,
	type varchar (32) not null,
	notif JSON not null,
	seen bool not null default false,
	created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (user_id) references users (id),
	index (user_id, id)
);
