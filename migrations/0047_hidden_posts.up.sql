create table if not exists hidden_posts (
	id int not null auto_increment,
    user_id binary (12) not null,
    post_id binary (12) not null,
	created_at datetime not null default current_timestamp(),

    primary key (id),
	foreign key (user_id) references users (id),
	foreign key (post_id) references posts (id),
    unique (user_id, post_id)
);
