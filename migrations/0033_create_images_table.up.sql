create table if not exists images (
    id binary (12) not null,
    store_name varchar (64) not null,
    store_metadata JSON,
    format varchar (16) not null,
    width int not null,
    height int not null,
    size int not null,
    upload_size int not null,
    average_color binary (12) not null,
    created_at datetime not null default current_timestamp(),
    deleted_at datetime,

    primary key (id)
);