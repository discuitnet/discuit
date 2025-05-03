create table if not exists post_visits (
	id bigint unsigned not null auto_increment,
	post_id binary (12) not null,
	user_id binary (12) not null,
	first_visited_at datetime not null default current_timestamp(),
	last_visited_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (post_id) references posts (id),
	foreign key (user_id) references users (id),
	unique key post_user (post_id, user_id)
);
