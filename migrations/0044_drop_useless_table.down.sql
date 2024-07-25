alter table temp_images drop column z_index;

rename table temp_images to temp_images_2;

/* The following generated from running 'show create table temp_images' */
CREATE TABLE `temp_images` (
  `id` binary(12) NOT NULL,
  `user_id` binary(12) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `temp_images_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

