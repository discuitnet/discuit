alter table posts add column link_image binary (12) after link_info;

alter table posts add constraint posts_fk_link_image foreign key (link_image) references images (id);

alter table communities add column pro_pic_2 binary (12) after pro_pic;

alter table communities add constraint communities_fk_pro_pic foreign key (pro_pic_2) references images (id);

alter table communities add column banner_image_2 binary (12) after banner_image;

alter table communities add constraint communities_fk_banner_image foreign key (banner_image_2) references images (id);