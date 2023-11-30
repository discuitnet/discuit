alter table users drop column default_feed_sort;

alter table users add column remember_feed_sort bool not null default false;