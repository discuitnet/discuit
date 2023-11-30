create table if not exists report_reasons (
    id int unsigned not null auto_increment,
    title varchar (255) not null,
    description varchar (1024),
	created_at datetime not null default current_timestamp(),

    primary key (id)
);

insert into report_reasons (title) values ("Breaks community rules");
insert into report_reasons (title) values ("Copyright violation");
insert into report_reasons (title) values ("Spam");
insert into report_reasons (title) values ("Pornography");

create table if not exists reports (
    id int unsigned not null auto_increment,
    community_id binary (12) not null,
	post_id binary (12),
    report_type tinyint not null,
    reason_id int unsigned not null,
    target_id binary (12)not null,
    created_by binary (12) not null,
    action_taken varchar(32),
    dealt_at datetime,
    dealt_by binary (12),
	created_at datetime not null default current_timestamp(),

    primary key (id),
    foreign key (community_id) references communities (id),
	index (post_id),
    foreign key (reason_id) references report_reasons (id),
    index (target_id),
    foreign key (created_by) references users (id),
    index (dealt_at),
	index (action_taken),
    foreign key (dealt_by) references users (id),
    index (created_at)
);
