create table if not exists temp_images_2 (
	id bigint unsigned not null auto_increment,
    user_id binary (12) not null,
    image_id binary (12) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (user_id) references users (id),
    foreign key (image_id) references images (id),
    unique (image_id),
    index (created_at)
);