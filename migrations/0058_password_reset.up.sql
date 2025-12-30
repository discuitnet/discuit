alter table users add column reset_link text;
alter table users add column reset_expires_at datetime;

create table if not exists password_requests (
    id int unsigned not null auto_increment,
    ip inet6 not null,
    userid binary(12),

    primary key (id),
    foreign key (userid) references users (id)
);
