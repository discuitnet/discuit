drop table temp_images;

rename table temp_images_2 to temp_images;

alter table temp_images add column z_index int not null default 0;