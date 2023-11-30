alter table users alter column points set default 1;
update users set points = points + 1;
