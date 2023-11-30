alter table users add column last_seen datetime not null default current_timestamp();
update users set last_seen = created_at;
