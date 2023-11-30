create table if not exists web_push_subscriptions (
    id bigint unsigned not null auto_increment,
    session_id varchar (512) not null,
    user_id binary (12) not null,
    push_subscription json not null,
	created_at datetime not null default current_timestamp(),
	updated_at datetime,

    primary key (id),
    foreign key (user_id) references users (id),
    unique (session_id)
);
