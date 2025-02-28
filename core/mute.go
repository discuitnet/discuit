package core

import (
	"context"
	"database/sql"
	"errors"
	"slices"
	"sort"
	"strconv"
	"time"

	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

type MuteType string

func (t MuteType) Valid() bool {
	return slices.Contains([]MuteType{"", MuteTypeUser, MuteTypeCommunity}, t)
}

const (
	MuteTypeUser      = MuteType("user")
	MuteTypeCommunity = MuteType("community")
)

type Mute struct {
	ID               int       `json:"-"`
	PublicID         string    `json:"id"` // augmented id based on Type
	User             uid.ID    `json:"-"`
	Type             MuteType  `json:"type"`
	MutedUserID      *uid.ID   `json:"mutedUserId,omitempty"`      // may be empty and omitted base on Type
	MutedCommunityID *uid.ID   `json:"mutedCommunityId,omitempty"` // may be empty and omitted base on Type
	CreatedAt        time.Time `json:"createdAt"`

	MutedUser      *User      `json:"mutedUser,omitempty"`
	MutedCommunity *Community `json:"mutedCommunity,omitempty"`
}

func (m *Mute) setPrintID() {
	s := strconv.Itoa(m.ID)
	switch m.Type {
	case MuteTypeUser:
		s = "u_" + s
	case MuteTypeCommunity:
		s = "c_" + s
	default:
		panic("unknown mute type")
	}
	m.PublicID = s
}

func extractMuteID(s string) (t MuteType, id int, err error) {
	var errMuteID = errors.New("invalid mute id")
	if len(s) <= 2 {
		err = errMuteID
		return
	}

	prefix := s[:2]
	switch prefix {
	case "u_":
		t = MuteTypeUser
	case "c_":
		t = MuteTypeCommunity
	default:
		err = errMuteID
		return
	}

	id, err = strconv.Atoi(s[2:])
	if err != nil {
		err = errMuteID
	}
	return
}

func GetMutes(ctx context.Context, db *sql.DB, user uid.ID) ([]*Mute, error) {
	communityMutes, err := GetMutedCommunities(ctx, db, user, true)
	if err != nil {
		return nil, err
	}
	userMutes, err := GetMutedUsers(ctx, db, user, true)
	if err != nil {
		return nil, err
	}

	all := append(communityMutes, userMutes...)
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.Before(all[j].CreatedAt)
	})
	if all == nil {
		all = []*Mute{} // for the json "[]" output
	}
	return all, nil
}

func GetMutedCommunities(ctx context.Context, db *sql.DB, user uid.ID, fetchCommunities bool) ([]*Mute, error) {
	rows, err := db.QueryContext(ctx, "SELECT id, community_id, created_at FROM muted_communities WHERE user_id = ? ORDER BY id", user)
	if err != nil {
		return nil, err
	}

	var mutes []*Mute
	for rows.Next() {
		mute := &Mute{User: user, Type: MuteTypeCommunity}
		if err := rows.Scan(&mute.ID, &mute.MutedCommunityID, &mute.CreatedAt); err != nil {
			return nil, err
		}
		mutes = append(mutes, mute)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	var ids []uid.ID
	for i := range mutes {
		mutes[i].setPrintID()
		ids = append(ids, *mutes[i].MutedCommunityID)
	}

	if fetchCommunities {
		comms, err := GetCommunitiesByIDs(ctx, db, ids, nil)
		if err != nil {
			return nil, err
		}
		for _, comm := range comms {
			for _, mute := range mutes {
				if *mute.MutedCommunityID == comm.ID {
					mute.MutedCommunity = comm
					break
				}
			}
			comm.MutedByViewer = true
		}
	}
	return mutes, nil
}

func GetMutedUsers(ctx context.Context, db *sql.DB, user uid.ID, fillUsers bool) ([]*Mute, error) {
	rows, err := db.QueryContext(ctx, "SELECT id, muted_user_id, created_at FROM muted_users WHERE user_id = ? ORDER BY id", user)
	if err != nil {
		return nil, err
	}

	var mutes []*Mute
	for rows.Next() {
		mute := &Mute{User: user, Type: MuteTypeUser}
		if err := rows.Scan(&mute.ID, &mute.MutedUserID, &mute.CreatedAt); err != nil {
			return nil, err
		}
		mutes = append(mutes, mute)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	var ids []uid.ID
	for i := range mutes {
		mutes[i].setPrintID()
		ids = append(ids, *mutes[i].MutedUserID)
	}

	if fillUsers {
		users, err := GetUsersByIDs(ctx, db, ids, nil)
		if err != nil {
			return nil, err
		}
		for _, user := range users {
			for _, mute := range mutes {
				if user.ID == *mute.MutedUserID {
					mute.MutedUser = user
					break
				}
			}
		}
	}
	return mutes, nil
}

func Unmute(ctx context.Context, db *sql.DB, user uid.ID, id string) error {
	mType, idInt, err := extractMuteID(id)
	if err != nil {
		return err
	}

	switch mType {
	case MuteTypeCommunity:
		_, err = db.ExecContext(ctx, "delete from muted_communities where id = ? and user_id = ?", idInt, user)
	case MuteTypeUser:
		_, err = db.ExecContext(ctx, "delete from muted_users where id = ? and user_id = ?", idInt, user)
	}
	return err
}

// ClearMutes clears all mutes of user if t is empty, otherwise it clears either
// the community or the user mutes.
func ClearMutes(ctx context.Context, db *sql.DB, user uid.ID, t MuteType) (err error) {
	if t == "" || t == MuteTypeCommunity {
		_, err = db.ExecContext(ctx, "DELETE FROM muted_communities WHERE user_id = ?", user)
		if err != nil {
			return
		}
	}
	if t == "" || t == MuteTypeUser {
		_, err = db.ExecContext(ctx, "DELETE FROM muted_users where user_id = ?", user)
	}
	return
}

func MuteCommunity(ctx context.Context, db *sql.DB, user, community uid.ID) error {
	_, err := db.ExecContext(ctx, "INSERT INTO muted_communities (user_id, community_id) VALUES (?, ?)", user, community)
	if err != nil && msql.IsErrDuplicateErr(err) {
		return nil
	}
	return err
}

func UnmuteCommunity(ctx context.Context, db *sql.DB, user, community uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM muted_communities WHERE user_id = ? AND community_id = ?", user, community)
	return err
}

func MuteUser(ctx context.Context, db *sql.DB, user, mutedUser uid.ID) error {
	if is, err := UserDeleted(db, mutedUser); err != nil {
		return err
	} else if is {
		return ErrUserDeleted
	}

	_, err := db.ExecContext(ctx, "INSERT INTO muted_users (user_id, muted_user_id) VALUES (?, ?)", user, mutedUser)
	if err != nil && msql.IsErrDuplicateErr(err) {
		return nil
	}
	return err
}

func UnmuteUser(ctx context.Context, db *sql.DB, user, mutedUser uid.ID) error {
	_, err := db.ExecContext(ctx, "DELETE FROM muted_users WHERE user_id = ? AND muted_user_id = ?", user, mutedUser)
	return err
}
