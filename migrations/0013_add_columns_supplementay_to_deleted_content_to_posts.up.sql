alter table posts add column deleted_content_at datetime;
alter table posts add column deleted_content_by binary (12);
alter table posts add column deleted_content_as tinyint not null default 0;
