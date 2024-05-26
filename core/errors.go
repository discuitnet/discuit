package core

import (
	"net/http"

	"github.com/discuitnet/discuit/internal/httperr"
)

var (
	// ErrWrongPassword is returned by MatchLoginCredentials if username and password
	// do not match.
	ErrWrongPassword = &httperr.Error{HTTPStatus: http.StatusUnauthorized, Code: "wrong-password", Message: "Username and password do not match."}

	ErrUserDeleted = httperr.NewForbidden("user-deleted", "Cannot continue because the user is deleted.")
)

var (
	errNotAuthor = httperr.NewForbidden("not_author", "You are not the author.")
	errNotMod    = httperr.NewForbidden("not_mod", "You are not a moderator.")
	errNotAdmin  = httperr.NewForbidden("not_admin", "You are not an admin.")

	errImageNotFound = httperr.NewNotFound("image-not-found", "Image not found.")

	errCommunityNotFound = httperr.NewNotFound("community/not-found", "Community not found.")

	errUserNotFound            = httperr.NewNotFound("user_not_found", "User not found.")
	errUserBannedFromCommunity = httperr.NewForbidden("banned-from-community", "User is banned from the community.")
	errRestrictPost            = httperr.NewForbidden("restrict-post", "Community restricts posting to mods/admins.")

	errCommentDeleted  = httperr.NewForbidden("comment_deleted", "Comment(s) deleted.")
	errCommentNotFound = httperr.NewNotFound("comment_not_found", "Comment(s) not found.")

	errPostNotFound        = httperr.NewNotFound("post/not-found", "Post(s) not found.")
	errPostLocked          = httperr.NewForbidden("post-locked", "Post is locked.")
	errPostTypeUnsupported = httperr.NewBadRequest("post-type/unsupported", "Unsupported post type.")

	errInvalidUserGroup = httperr.NewBadRequest("user/invalid-group", "Invalid user-group.")
)
