create table if not exists pinned_site (
    id int unsigned not null auto_increment,
	post_id binary (12) not null,
    z_index int not null default 0,
	created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (post_id) references posts (id),
    unique (post_id)
);

alter table posts add column is_pinned_site bool not null default false;