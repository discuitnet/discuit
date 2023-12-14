alter table users add column pro_pic binary (12);

alter table users add constraint users_fk_pro_pic foreign key (pro_pic) references images (id);