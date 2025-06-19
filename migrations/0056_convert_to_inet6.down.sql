alter table users add column created_ip_2 varchar (45);
alter table users add column last_seen_ip_2 varchar (45);

update users set created_ip_2 = created_ip where created_ip is not null;
update users set last_seen_ip_2 = last_seen_ip where last_seen_ip is not null;

alter table users drop column created_ip;
alter table users drop column last_seen_ip;

alter table users rename column created_ip_2 to created_ip;
alter table users rename column last_seen_ip_2 to last_seen_ip;
