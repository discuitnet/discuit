alter table communities add column restrict_post bool not null default false;
alter table communities add column restrict_comment bool not null default false;