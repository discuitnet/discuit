create table if not exists lists (
	id bigint unsigned not null auto_increment,
	user_id binary (12) not null,
    name varchar (128) not null, /* A unique identifier for each list (per user). */
    display_name varchar (128) not null,
    public bool not null default false,
    description text,
    num_items int not null default 0,
    ordering tinyint not null default 0,
	created_at datetime not null default current_timestamp(),
	last_updated_at datetime not null default current_timestamp(),

    primary key (id),
    unique (user_id, name),
    index (user_id, created_at)
) AUTO_INCREMENT = 100000;

create table if not exists list_items (
	id bigint unsigned not null auto_increment,
	list_id bigint unsigned not null,
	target_type tinyint not null,
	target_id binary (12) not null, /* This column should be time ordered, since it represents uid.ID values. */
	created_at datetime not null default current_timestamp(), /* When the row's created, not the target. */

    primary key (id),
    unique (list_id, target_type, target_id),
    index (list_id, target_id), /* Ordered by target created at time. */
    index (list_id, created_at),
    foreign key (list_id) references lists (id) ON DELETE CASCADE
);

/* 
 * Create a favorites list for each user.
 * 
 * NOTE: Whenever changing the following line, make sure to change the
 * create-new-user function in Go as well.
 *
 */
insert into lists (user_id, name, display_name) select users.id, "bookmarks", "Bookmarks" from users;
