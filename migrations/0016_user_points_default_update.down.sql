update users set points = points - 1;
alter table users alter column points set default 0;

