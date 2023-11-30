create table if not exists muted_communities (
    id bigint not null auto_increment,
    user_id binary (12) not null,
    community_id binary (12) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (user_id) references users (id),
    foreign key (community_id) references communities (id),
    unique (user_id, community_id)
);

create table if not exists muted_users (
    id bigint not null auto_increment,
    user_id binary (12) not null,
    muted_user_id binary (12) not null,
    created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (user_id) references users (id),
    foreign key (muted_user_id) references users (id),
    unique (user_id, muted_user_id)
);

alter table posts_today add column user_id binary (12) not null;
update posts_today set user_id = (select posts.user_id from posts where posts.id = posts_today.post_id);

alter table posts_week add column user_id binary (12) not null;
update posts_week set user_id = (select posts.user_id from posts where posts.id = posts_week.post_id);

alter table posts_month add column user_id binary (12) not null;
update posts_month set user_id = (select posts.user_id from posts where posts.id = posts_month.post_id);

alter table posts_year add column user_id binary (12) not null;
update posts_year set user_id = (select posts.user_id from posts where posts.id = posts_year.post_id);
