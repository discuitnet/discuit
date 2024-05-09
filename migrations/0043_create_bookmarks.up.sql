create table if not exists bookmark_lists (
    id binary (12) not null,
    user_id binary (12) not null,
    name varchar (128) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (user_id) references users (id)
);

create table if not exists bookmarks (
    id bigint unsigned not null auto_increment,
    list_id binary (12) not null,
    item_type enum ('post', 'comment') not null,
    item_id binary (12) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (list_id) references bookmark_lists (id),
    unique (list_id, item_type, item_id)
);