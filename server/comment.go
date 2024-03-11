package server

import (
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

// /api/posts/:postID/comments [GET]
func (s *Server) getComments(w *responseWriter, r *request) error {
	post, err := core.GetPost(r.ctx, s.db, nil, r.muxVar("postID"), r.viewer, true)
	if err != nil {
		return err
	}

	query := r.urlQuery()

	// Reply comments.
	parentIDText := query.Get("parentId")
	if parentIDText != "" {
		parentID, err := strToID(parentIDText)
		if err != nil {
			return err
		}
		comments, err := post.GetCommentReplies(r.ctx, r.viewer, parentID)
		if err != nil {
			return err
		}
		return w.writeJSON(comments)
	}

	var (
		nextText   = query.Get("next")
		nextPoints int
		nextID     *uid.ID
	)
	if nextText != "" {
		if nextPoints, nextID, err = core.NextPointsIDCursor(nextText); err != nil {
			return core.ErrInvalidFeedCursor
		}
	}
	var cursor *core.CommentsCursor
	if nextID != nil {
		cursor = new(core.CommentsCursor)
		cursor.Upvotes = nextPoints
		cursor.NextID = *nextID
	}

	if _, err = post.GetComments(r.ctx, r.viewer, cursor); err != nil {
		return err
	}

	res := struct {
		Comments []*core.Comment `json:"comments"`
		Next     msql.NullString `json:"next"`
	}{
		Comments: post.Comments,
		Next:     post.CommentsNext,
	}

	return w.writeJSON(res)
}

// /api/:commentID [GET]
func (s *Server) getComment(w *responseWriter, r *request) error {
	commentID, err := strToID(r.muxVar("commentID"))
	if err != nil {
		return err
	}

	comment, err := core.GetComment(r.ctx, s.db, commentID, r.viewer)
	if err != nil {
		return err
	}

	return w.writeJSON(comment)
}

// /api/posts/:postID/comments [POST]
func (s *Server) addComment(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimit(r, "add_comment_1_"+r.viewer.String(), time.Second*5, 2); err != nil {
		return err
	}
	if err := s.rateLimit(r, "add_comment_2_"+r.viewer.String(), time.Hour*24, 300); err != nil {
		return err
	}

	req := struct {
		ParentCommentID uid.NullID `json:"parentCommentId"`
		Body            string     `json:"body"`
	}{}
	if err := r.unmarshalJSONBody(&req); err != nil {
		return err
	}

	postID := r.muxVar("postID")
	post, err := core.GetPost(r.ctx, s.db, nil, postID, nil, true)
	if err != nil {
		return err
	}

	var as core.UserGroup = core.UserGroupNormal
	if _as := r.urlQuery().Get("userGroup"); _as != "" {
		if err = as.UnmarshalText([]byte(_as)); err != nil {
			return err
		}
	}

	var parentID *uid.ID
	if req.ParentCommentID.Valid {
		parentID = &req.ParentCommentID.ID
	}

	comment, err := post.AddComment(r.ctx, *r.viewer, as, parentID, req.Body)
	if err != nil {
		return err
	}

	// +1 your own comment.
	comment.Vote(r.ctx, *r.viewer, true)

	return w.writeJSON(comment)
}

// /api/posts/:postID/comments/:commentID [PUT]
func (s *Server) updateComment(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimitUpdateContent(r, *r.viewer); err != nil {
		return err
	}

	commentID, err := strToID(r.muxVar("commentID"))
	if err != nil {
		return err
	}
	comment, err := core.GetComment(r.ctx, s.db, commentID, r.viewer)
	if err != nil {
		return err
	}

	query := r.urlQuery()
	action := query.Get("action")
	if action == "" {
		var tcom core.Comment
		if err := r.unmarshalJSONBody(&tcom); err != nil {
			return err
		}
		// Override updatable fields.
		comment.Body = tcom.Body
		if err = comment.Save(r.ctx, *r.viewer); err != nil {
			return err
		}
	} else {
		switch action {
		case "changeAsUser":
			var g core.UserGroup
			if err = g.UnmarshalText([]byte(query.Get("userGroup"))); err != nil {
				return err
			}
			if err = comment.ChangeUserGroup(r.ctx, *r.viewer, g); err != nil {
				return err
			}
		default:
			return httperr.NewBadRequest("invalid_action", "Unsupported action.")
		}
	}

	return w.writeJSON(comment)
}

// /api/posts/:postID/comments/:commentID [DELETE]
func (s *Server) deleteComment(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimitUpdateContent(r, *r.viewer); err != nil {
		return err
	}

	commentID, err := strToID(r.muxVar("commentID"))
	if err != nil {
		return err
	}
	comment, err := core.GetComment(r.ctx, s.db, commentID, r.viewer)
	if err != nil {
		return err
	}

	query := r.urlQuery()
	deleteAs := core.UserGroupNormal
	if _deleteAs := query.Get("deleteAs"); _deleteAs != "" {
		if err = deleteAs.UnmarshalText([]byte(_deleteAs)); err != nil {
			return err
		}
	}

	if err := comment.Delete(r.ctx, *r.viewer, deleteAs); err != nil {
		return err
	}

	return w.writeJSON(comment)
}

// /api/_commentVote [ POST ]
func (s *Server) commentVote(w *responseWriter, r *request) error {
	if !r.loggedIn {
		return errNotLoggedIn
	}

	if err := s.rateLimitVoting(r, *r.viewer); err != nil {
		return err
	}

	req := struct {
		CommentID uid.ID `json:"commentId"`
		Up        bool   `json:"up"`
	}{Up: true}
	if err := r.unmarshalJSONBody(&req); err != nil {
		return err
	}

	comment, err := core.GetComment(r.ctx, s.db, req.CommentID, r.viewer)
	if err != nil {
		return err
	}

	if comment.ViewerVoted.Bool {
		if req.Up == comment.ViewerVotedUp.Bool {
			err = comment.DeleteVote(r.ctx, *r.viewer)
		} else {
			err = comment.ChangeVote(r.ctx, *r.viewer, req.Up)
		}
	} else {
		err = comment.Vote(r.ctx, *r.viewer, req.Up)
	}
	if err != nil {
		return err
	}

	return w.writeJSON(comment)
}
