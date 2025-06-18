alter table community_requests add column denied_note text;
alter table community_requests add column denied_by varchar (20);
alter table community_requests add column denied_at datetime;
