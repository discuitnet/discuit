create table if not exists users (
	id binary (12) not null,
	user_index int not null auto_increment,
	username varchar (20) not null,
	username_lc varchar (20) not null,
	email varchar (255),
	email_confirmed_at datetime,
	password varchar (128) not null,
	about_me text,
	points int not null default 0,
	is_admin bool not null default false,
	notifications_new_count int not null default 0,
	created_at datetime not null default current_timestamp(),
	deleted_at datetime,

	primary key (id),
	unique (user_index),
	unique (username_lc),
	unique (email)
);

create table if not exists communities (
	id binary (12) not null,
	user_id binary (12) not null,
	name varchar (128) not null,
	name_lc varchar (128) not null,
	nsfw bool not null default false,
	about text,
	no_members int unsigned not null default 0,
	created_at datetime not null default current_timestamp(),
	deleted_at datetime,
	deleted_by binary (12),

	primary key (id),
	foreign key (user_id) references users (id),
	unique (name_lc),
	foreign key (deleted_by) references users (id)
);

create table if not exists community_members (
	id bigint unsigned not null auto_increment,
	community_id binary (12) not null,
	user_id binary (12) not null,
	is_mod bool not null default false,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (community_id) references communities (id),
	foreign key (user_id) references users (id),
	unique key one_user (community_id, user_id)
);

create table if not exists community_mods (
	id int unsigned not null auto_increment,
	community_id binary (12) not null,
	user_id binary (12) not null,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (community_id) references communities (id),
	foreign key (user_id) references users (id),
	unique key one_user (community_id, user_id)
);

create table if not exists community_banned (
	id int unsigned not null auto_increment,
	community_id binary (12) not null,
	user_id binary (12) not null,
	expires datetime,
	banned_by binary (12) not null,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (community_id) references communities (id),
	foreign key (user_id) references users (id),
	foreign key (banned_by) references users (id),
	unique (community_id, user_id)
);

create table if not exists posts (
	id binary (12) not null,
	public_id char (8) not null,
	user_id binary (12) not null,
	user_group  tinyint not null default 1,
	community_id binary (12) not null,
	title varchar (255) not null,
	body text,
	locked bool not null default false,
	locked_at datetime,
	locked_by binary (12),
	locked_by_group tinyint not null default 0,
	no_comments int unsigned not null default 0,
	upvotes int unsigned not null default 0,
	downvotes int unsigned not null default 0,
	points int not null default 0,
	hotness bigint not null default 0,
	created_at datetime not null default current_timestamp(),
	edited_at datetime,
	deleted bool not null default false,
	deleted_at datetime,
	deleted_by binary (12),
	deleted_by_group tinyint not null default 0,

	primary key (id),
	unique key (public_id),
	foreign key (user_id) references users (id),
	foreign key (community_id) references communities (id),
	foreign key (locked_by) references users (id),
	index (deleted, points, id),
	index (community_id, deleted, points, id),
	index (locked_at),
	index (deleted, id),
	index (community_id, deleted, id),
	index (deleted_at),
	index (deleted, hotness, id),
	index (deleted, community_id, hotness, id),
	foreign key (deleted_by) references users (id)
);

create table if not exists posts_today (
	id bigint unsigned not null auto_increment,
	community_id binary (12) not null,
	post_id binary (12) not null,
	points int not null default 0,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (post_id) references posts (id),
	foreign key (community_id) references communities (id),
	index (created_at),
	index (community_id, created_at),
	index (points, post_id),
	index (community_id, points)
);

create table if not exists posts_week like posts_today;
create table if not exists posts_month like posts_today;
create table if not exists posts_year like posts_today;

create table if not exists post_votes (
	id bigint unsigned not null auto_increment,
	post_id binary (12) not null,
	user_id binary (12) not null,
	up bool not null default true,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (post_id) references posts(id),
	foreign key (user_id) references users(id),
	unique key post_user (post_id, user_id)
);

create table if not exists comments (
	id binary (12) not null,
	post_id binary (12) not null,
	post_public_id char (8) not null,
	community_id binary (12) not null,
	community_name varchar (128) not null,
	user_id binary (12) not null,
	username varchar (20) not null,
	user_deleted bool not null default false,
	user_group tinyint not null default 1,
	parent_id binary (12),
	ancestors JSON,
	depth tinyint unsigned not null default 0,
	no_replies int unsigned not null default 0,
	no_replies_direct int unsigned not null default 0,
	body text,
	upvotes int unsigned not null default 0,
	downvotes int unsigned not null default 0,
	points int not null default 0,
	created_at datetime not null default current_timestamp(),
	edited_at datetime,
	deleted_at datetime,
	deleted_by binary (12),
	deleted_by_group tinyint not null default 0,

	primary key (id),
	foreign key (post_id) references posts(id),
	foreign key (community_id) references communities(id),
	foreign key (user_id) references users(id),
	foreign key (parent_id) references comments(id),
	index (post_id, depth, id),
	index (post_id, upvotes, id),
	index (post_id, created_at),
	foreign key (deleted_by) references users(id)
);

create table if not exists comment_replies (
	id bigint unsigned not null auto_increment,
	parent_id binary (12) not null,
	reply_id binary (12) not null,

	primary key (id),
	index (parent_id, reply_id)
);

create table if not exists comment_votes (
	id bigint unsigned not null auto_increment,
	comment_id binary (12) not null,
	user_id binary (12) not null,
	up bool not null default 1,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (comment_id) references comments(id),
	foreign key (user_id) references users(id),
	unique key comment_user (comment_id, user_id)
);

create table if not exists posts_comments (
	id bigint unsigned not null auto_increment,
	target_id binary (12) not null,
	target_type tinyint not null,
	user_id binary (12) not null,

	primary key (id),
	unique (user_id, target_id),
	index (user_id, target_type, target_id)
);
