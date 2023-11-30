package server

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/sessions"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gorilla/mux"
)

// /api/posts/:postID/comments [GET]
func (s *Server) getComments(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	ctx := r.Context()
	_, userID := isLoggedIn(ses)

	post, err := core.GetPost(ctx, s.db, nil, mux.Vars(r)["postID"], userID, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()

	// Reply comments.
	parentIDText := query.Get("parentId")
	if parentIDText != "" {
		parentID, err := s.getID(w, r, parentIDText)
		if err != nil {
			return
		}
		comments, err := post.GetCommentReplies(ctx, userID, parentID)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		data, _ := json.Marshal(comments)
		w.Write(data)
		return
	}

	var (
		nextText   = query.Get("next")
		nextPoints int
		nextID     *uid.ID
	)
	if nextText != "" {
		if nextPoints, nextID, err = core.NextPointsIDCursor(nextText); err != nil {
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Invalid cursor", "")
			return
		}
	}
	var cursor *core.CommentsCursor
	if nextID != nil {
		cursor = new(core.CommentsCursor)
		cursor.Upvotes = nextPoints
		cursor.NextID = *nextID
	}

	if _, err = post.GetComments(ctx, userID, cursor); err != nil {
		s.writeError(w, r, err)
		return
	}

	res := struct {
		Comments []*core.Comment `json:"comments"`
		Next     msql.NullString `json:"next"`
	}{post.Comments, post.CommentsNext}
	data, _ := json.Marshal(res)
	w.Write(data)
}

// /api/:commentID [GET]
func (s *Server) getComment(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	commentID, err := s.getID(w, r, mux.Vars(r)["commentID"])
	if err != nil {
		return
	}

	_, userID := isLoggedIn(ses)
	comment, err := core.GetComment(r.Context(), s.db, commentID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(comment)
	w.Write(data)
}

// /api/posts/:postID/comments [POST]
func (s *Server) addComment(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
	loggedIn, userID := isLoggedIn(ses)
	if !loggedIn {
		s.writeErrorNotLoggedIn(w, r)
		return
	}

	// Limits.
	if err := s.rateLimit(w, r, "add_comment_1_"+userID.String(), time.Second*5, 2); err != nil {
		return
	}
	if err := s.rateLimit(w, r, "add_comment_2_"+userID.String(), time.Hour*24, 300); err != nil {
		return
	}

	inc, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}
	req := struct {
		ParentCommentID uid.NullID `json:"parentCommentId"`
		Body            string     `json:"body"`
	}{}
	if err = s.unmarshalJSON(w, r, inc, &req); err != nil {
		return
	}

	ctx := r.Context()
	postID := mux.Vars(r)["postID"]
	post, err := core.GetPost(ctx, s.db, nil, postID, nil, true)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	var as core.UserGroup = core.UserGroupNormal
	if _as := r.URL.Query().Get("userGroup"); _as != "" {
		if err = as.UnmarshalText([]byte(_as)); err != nil {
			s.writeError(w, r, err)
			return
		}
	}

	var parentID *uid.ID
	if req.ParentCommentID.Valid {
		parentID = &req.ParentCommentID.ID
	}

	comment, err := post.AddComment(ctx, *userID, as, parentID, req.Body)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	// +1 your own comment.
	comment.Vote(ctx, *userID, true)

	data, _ := json.Marshal(comment)
	w.Write(data)
}

// /api/posts/:postID/comments/:commentID [PUT]
func (s *Server) updateComment(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
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
	commentID, err := s.getID(w, r, mux.Vars(r)["commentID"])
	if err != nil {
		return
	}
	comment, err := core.GetComment(ctx, s.db, commentID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()
	action := query.Get("action")
	if action == "" {
		var tcom core.Comment
		data, err := io.ReadAll(r.Body)
		if err != nil {
			s.writeError(w, r, err)
			return
		}
		if err = s.unmarshalJSON(w, r, data, &tcom); err != nil {
			return
		}
		// Override updatable fields.
		comment.Body = tcom.Body
		if err = comment.Save(ctx, *userID); err != nil {
			s.writeError(w, r, err)
			return
		}
	} else {
		switch action {
		case "changeAsUser":
			var g core.UserGroup
			if err = g.UnmarshalText([]byte(query.Get("userGroup"))); err != nil {
				s.writeError(w, r, err)
				return
			}
			if err = comment.ChangeUserGroup(ctx, *userID, g); err != nil {
				s.writeError(w, r, err)
				return
			}
		default:
			s.writeErrorCustom(w, r, http.StatusBadRequest, "Unsupported action.", "")
			return
		}
	}

	data, _ := json.Marshal(comment)
	w.Write(data)

}

// /api/posts/:postID/comments/:commentID [DELETE]
func (s *Server) deleteComment(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
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

	commentID, err := s.getID(w, r, mux.Vars(r)["commentID"])
	if err != nil {
		return
	}
	comment, err := core.GetComment(ctx, s.db, commentID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	query := r.URL.Query()
	deleteAs := core.UserGroupNormal
	if _deleteAs := query.Get("deleteAs"); _deleteAs != "" {
		if err = deleteAs.UnmarshalText([]byte(_deleteAs)); err != nil {
			s.writeError(w, r, err)
			return
		}
	}
	if err := comment.Delete(ctx, *userID, deleteAs); err != nil {
		s.writeError(w, r, err)
		return
	}

	data, _ := json.Marshal(comment)
	w.Write(data)
}

// /api/_commentVote [ POST ]
func (s *Server) commentVote(w http.ResponseWriter, r *http.Request, ses *sessions.Session) {
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
		CommentID uid.ID `json:"commentId"`
		Up        bool   `json:"up"`
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
	comment, err := core.GetComment(ctx, s.db, req.CommentID, userID)
	if err != nil {
		s.writeError(w, r, err)
		return
	}

	if comment.ViewerVoted.Bool {
		if req.Up == comment.ViewerVotedUp.Bool {
			err = comment.DeleteVote(ctx, *userID)
		} else {
			err = comment.ChangeVote(ctx, *userID, req.Up)
		}
	} else {
		err = comment.Vote(ctx, *userID, req.Up)
	}
	if err != nil {
		s.writeError(w, r, err)
	}

	bytes, _ := json.Marshal(comment)
	w.Write(bytes)
}
