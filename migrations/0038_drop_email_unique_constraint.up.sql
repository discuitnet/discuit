alter table users drop index email; /* drop unique key */

alter table users add index email (email);