alter table users drop column remember_feed_sort;

alter table users add column default_feed_sort int not null default 0;