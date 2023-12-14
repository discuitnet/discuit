alter table users drop index email;

alter table users add unique email (email);