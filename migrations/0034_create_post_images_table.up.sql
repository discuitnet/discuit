create table if not exists post_images (
	id bigint unsigned not null auto_increment,
    post_id binary (12) not null,
    image_id binary (12) not null,
    z_index int not null default 0,

    primary key (id),
    unique (post_id, image_id),
	foreign key (post_id) references posts (id),
	foreign key (image_id) references images (id),
    unique (image_id)
);
