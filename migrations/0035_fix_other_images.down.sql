alter table posts drop constraint posts_fk_link_image ;

alter table posts drop column link_image;

alter table communities drop constraint communities_fk_pro_pic;

alter table communities drop column pro_pic_2;

alter table communities drop constraint communities_fk_banner_image;

alter table communities drop column banner_image_2;