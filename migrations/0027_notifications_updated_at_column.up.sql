alter table notifications add column updated_at datetime not null default current_timestamp();

alter table notifications add index user_id_updated_at (user_id, updated_at);

update notifications set updated_at = created_at;
