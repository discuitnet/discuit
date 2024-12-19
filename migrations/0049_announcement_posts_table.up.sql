create table if not exists announcement_posts (
	id int not null auto_increment,
	post_id binary (12) not null,
	announced_by binary (12) not null, 
	sending_started_at datetime not null default current_timestamp(),
	sending_finished_at datetime,
	total_sent int not null default 0,

	primary key (id),
	foreign key (post_id) references posts (id),
	foreign key (announced_by) references users (id),
	unique (post_id)
);

create table if not exists announcement_notifications_sent (
	id int not null auto_increment,
	post_id binary (12) not null,
	user_id binary (12) not null,
	sent_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (post_id) references posts (id),
	foreign key (user_id) references users (id),
	unique (post_id, user_id)
);