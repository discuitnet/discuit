package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/sessions"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/posts [POST]
func (s *Server) addPost(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	var err error

	// Limits.
	if err := s.rateLimit(w, r, "add_post_1_"+userID.String(), time.Second*10, 1); err != nil {
		return
	}
	// Limits.
	if err := s.rateLimit(w, r, "add_post_2_"+userID.String(), time.Hour*24, 70); err != nil {
		return
	}

	values, err := s.bodyToMap(w, r, true)
	if err != nil {
		return
	}

	var postType core.PostType = core.PostTypeText
	if values["type"] != "" {
		if err = postType.UnmarshalText([]byte(values["type"])); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	if s.config.DisableImagePosts && postType == core.PostTypeImage {
		// Disallow image post creation.
		s.writeErrorCustom(w, r, http.StatusForbidden, "Image posts are not allowed", "no_image_posts")
		return
	}

	title := values["title"] // required
	body := values["body"]
	commName := values["community"] // required

	userGroup := core.UserGroupNormal
	if text := values["userGroup"]; text != "" {
		if err := userGroup.UnmarshalText([]byte(text)); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	ctx := r.Context()
	comm, err := core.GetCommunityByName(ctx, s.db, commName, nil)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	var post *core.Post
	switch postType {
	case core.PostTypeText:
		post, err = core.CreateTextPost(ctx, s.db, *userID, comm.ID, title, body)
	case core.PostTypeImage:
		imageID, idErr := uid.FromString(values["imageId"])
		if idErr != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid image id", "")
			return
		}
		post, err = core.CreateImagePost(ctx, s.db, *userID, comm.ID, title, imageID)
	case core.PostTypeLink:
		post, err = core.CreateLinkPost(ctx, s.db, *userID, comm.ID, title, values["url"])
	default:
		s.writeError(w, r, errors.New("invalid post type"))
		return
	}
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if userGroup != core.UserGroupNormal {
		if err := post.ChangeUserGroup(ctx, *userID, userGroup); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	// +1 your own post.
	post.Vote(ctx, *userID, true)

	data, _ := json.Marshal(post)
	w.Write(data)
}

// /api/posts/:postID [GET]
func (s *Server) getPost(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	postID := mux.Vars(r)["postID"] // PublicID

	ctx := r.Context()
	_, userID := isLoggedIn(ses)
	post, err := core.GetPost(ctx, s.db, nil, postID, userID, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if _, err = post.GetComments(ctx, userID, nil); err != nil {
		s.writeError(w, r, err)
		return
	}

	if fetchCommunity := r.URL.Query().Get("fetchCommunity"); fetchCommunity == "" || fetchCommunity == "true" {
		comm, err := core.GetCommunityByID(ctx, s.db, post.CommunityID, userID)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = comm.FetchRules(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = comm.PopulateMods(ctx); err != nil {
			s.writeError(w, r, err)
			return
		}
		post.Community = comm
	}

	b, err := json.Marshal(post)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	w.Write(b)
}

// /api/posts/:postID [PUT]
func (s *Server) updatePost(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	postID := mux.Vars(r)["postID"] // PublicID
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimitUpdateContent(w, r, *userID); err != nil {
		return
	}

	ctx := r.Context()
	post, err := core.GetPost(ctx, s.db, nil, postID, userID, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()
	action := query.Get("action")
	if action == "" {
		// Update post.
		var tpost core.Post
		data, err := io.ReadAll(r.Body)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = s.unmarshalJSON(w, r, data, &tpost); err != nil {
			return
		}
		tpost.Title = strings.TrimSpace(tpost.Title)
		tpost.Body.String = strings.TrimSpace(tpost.Body.String)

		// override updatable fields
		needSaving := false
		if post.Type == core.PostTypeText && !post.DeletedContent {
			if post.Body != tpost.Body {
				needSaving = true
				post.Body = tpost.Body
			}
		}
		if post.Title != tpost.Title {
			needSaving = true
			post.Title = tpost.Title
		}

		if needSaving {
			if err = post.Save(ctx, *userID); err != nil {
				s.writeError(w, r, err)
				return
			}
		}
	} else {
		switch action {
		case "lock", "unlock":
			var as core.UserGroup
			if err = as.UnmarshalText([]byte(query.Get("lockAs"))); err != nil {
				s.writeError(w, r, err)
				return
			}
			if action == "lock" {
				err = post.Lock(ctx, *userID, as)
			} else {
				err = post.Unlock(ctx, *userID)
			}
			if err != nil {
				s.writeError(w, r, err)
				return
			}
		case "changeAsUser":
			var as core.UserGroup
			if err = as.UnmarshalText([]byte(query.Get("userGroup"))); err != nil {
				s.writeError(w, r, err)
				return
			}
			if err = post.ChangeUserGroup(ctx, *userID, as); err != nil {
				s.writeError(w, r, err)
				return
			}
		case "pin", "unpin":
			siteWide := strings.ToLower(query.Get("siteWide")) == "true"
			if err = post.Pin(ctx, *userID, siteWide, action == "unpin"); err != nil {
				s.writeError(w, r, err)
				return
			}
		default:
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported action.", "")
			return
		}
	}

	b, _ := json.Marshal(post)
	w.Write(b)
}

// /api/posts/:postID [DELETE]
func (s *Server) deletePost(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	postID := mux.Vars(r)["postID"] // PublicID
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimitUpdateContent(w, r, *userID); err != nil {
		return
	}

	ctx := r.Context()
	post, err := core.GetPost(ctx, s.db, nil, postID, userID, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	query := r.URL.Query()

	var as core.UserGroup
	if err = as.UnmarshalText([]byte(query.Get("deleteAs"))); err != nil {
		s.writeError(w, r, err)
		return
	}
	deleteContent := false
	if dc := strings.ToLower(query.Get("deleteContent")); dc != "" {
		if dc == "true" {
			deleteContent = true
		} else if dc != "false" {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "deletedContent must be a bool", "")
			return
		}
	}
	if err := post.Delete(ctx, *userID, as, deleteContent); err != nil {
		s.writeError(w, r, err)
		return
	}

	b, _ := json.Marshal(post)
	w.Write(b)
}

// /api/_postVote [ POST ]
func (s *Server) postVote(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimitVoting(w, r, *userID); err != nil {
		return
	}

	req := struct {
		PostID uid.ID `json:"postId"`
		Up     bool   `json:"up"`
	}{Up: true}

	data, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	if err = s.unmarshalJSON(w, r, data, &req); err != nil {
		return
	}

	ctx := r.Context()
	post, err := core.GetPost(ctx, s.db, &req.PostID, "", userID, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if post.ViewerVoted.Bool {
		if req.Up == post.ViewerVotedUp.Bool {
			err = post.DeleteVote(ctx, *userID)
		} else {
			err = post.ChangeVote(ctx, *userID, req.Up)
		}
	} else {
		err = post.Vote(ctx, *userID, req.Up)
	}
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	bytes, _ := json.Marshal(post)
	w.Write(bytes)
}

// /api/_uploads [ POST ]
func (s *Server) imageUpload(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	if s.config.DisableImagePosts {
		s.writeErrorCustom(w, r, http.StatusForbidden, "Image posts are not all allowed", "no_image_posts")
		return
	}

	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "uploads_1_"+userID.String(), time.Second*2, 1); err != nil {
		return
	}
	// Limits.
	if err := s.rateLimit(w, r, "uploads_2_"+userID.String(), time.Hour*24, 40); err != nil {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, int64(s.config.MaxImageSize)) // limit max upload size
	if err := r.ParseMultipartForm(int64(s.config.MaxImageSize)); err != nil {
		s.writeErrorCustom(w, r, http.StatusBadRequest, "Max file size exceeded", "file_size_exceeded")
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	defer file.Close()

	fileData, err := io.ReadAll(file)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	image, err := core.SavePostImage(r.Context(), s.db, *userID, fileData)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(image.Image())
	w.Write(data)
}
