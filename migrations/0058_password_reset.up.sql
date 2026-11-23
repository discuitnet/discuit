alter table users add column reset_link text;
alter table users add column reset_expires_at datetime;

create table if not exists password_requests (
    id int unsigned not null auto_increment,
    ip inet6 not null,
    username  varchar (20) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
);
