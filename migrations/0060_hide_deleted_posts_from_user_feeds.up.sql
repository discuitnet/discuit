UPDATE posts_comments
INNER JOIN posts ON posts.id = posts_comments.target_id
SET posts_comments.deleted = TRUE
WHERE posts_comments.target_type = 0 AND posts.deleted = TRUE;
