alter table posts add column `type` tinyint not null default 0 after `id`;

alter table posts add column image text after body;

create table if not exists temp_images (
	id binary (12) not null,
	user_id binary (12) not null,
	created_at datetime not null default current_timestamp(),

	primary key (id),
	foreign key (user_id) references users (id),
	index (created_at)
);
					
