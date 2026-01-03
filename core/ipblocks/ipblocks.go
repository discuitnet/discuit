package ipblocks

import (
	"context"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/yl2chen/cidranger"
)

type Blocker struct {
	blockedNetworks cidranger.Ranger
	blockedIPs      map[string]bool
	mu              sync.Mutex
	db              *sql.DB
	torblocker      *torBlocker
}

func NewBlocker(db *sql.DB) *Blocker {
	return &Blocker{
		blockedNetworks: cidranger.NewPCTrieRanger(),
		blockedIPs:      make(map[string]bool),
		db:              db,
		torblocker:      newTorBlocker(),
	}
}

func (bl *Blocker) LoadDatabaseBlocks(ctx context.Context) error {
	rset, err := GetAllIPBlocks(ctx, bl.db, InEffectInEffect, 0, "")
	if err != nil {
		return err
	}

	// Reset first:
	bl.mu.Lock()
	bl.blockedNetworks = cidranger.NewPCTrieRanger()
	bl.blockedIPs = make(map[string]bool)
	bl.mu.Unlock()

	for _, block := range rset.Blocks {
		if err := bl.insert(block); err != nil {
			return err
		}
	}

	return nil
}

func (bl *Blocker) TorBlocked() bool {
	return bl.torblocker.Blocked()
}

func (bl *Blocker) BlockTor() {
	bl.torblocker.Block()
}

func (bl *Blocker) UnblockTor() {
	bl.torblocker.Unblock()
}

func (bl *Blocker) Match(address string) (bool, error) {
	bl.mu.Lock()
	defer bl.mu.Unlock()

	if bl.torblocker.Match(address) {
		return true, nil
	}

	if bl.blockedIPs[address] {
		return true, nil
	}

	contains, err := bl.blockedNetworks.Contains(net.ParseIP(address))
	if err != nil {
		return false, fmt.Errorf("ipblocks network match error for IP address %s", address)
	}
	return contains, nil
}

func (bl *Blocker) insert(block *Block) error {
	bl.mu.Lock()
	defer bl.mu.Unlock()

	if block.IsNetwork() {
		ipnet := block.IPNet()
		if err := bl.blockedNetworks.Insert(cidranger.NewBasicRangerEntry(ipnet)); err != nil {
			return fmt.Errorf("failed to insert IP block for network %s", ipnet.String())
		}
	} else {
		bl.blockedIPs[block.IP.String()] = true
	}

	return nil
}

func (bl *Blocker) remove(block *Block) error {
	bl.mu.Lock()
	defer bl.mu.Unlock()

	if block.IsNetwork() {
		ipnet := block.IPNet()
		if _, err := bl.blockedNetworks.Remove(ipnet); err != nil {
			return fmt.Errorf("failed to remove IP block for network %s", ipnet.String())
		}
	} else {
		delete(bl.blockedIPs, block.IP.String())
	}

	return nil
}

func (bl *Blocker) Block(ctx context.Context, addr string, blockedBy uid.ID, expiresAt *time.Time, note string) (*Block, error) {
	var (
		ip         net.IP
		maskedBits int
		lastIP     net.IP
	)

	if strings.Contains(addr, "/") {
		_, ipnet, err := net.ParseCIDR(addr)
		if err != nil {
			return nil, httperr.NewBadRequest("bad-ip", fmt.Sprintf("Error parsing ip address: %v.", err))
		}
		ip = ipnet.IP.To16()
		maskedBits, _ = ipnet.Mask.Size()
		lastIP = lastIPAddress(ipnet)
		if lastIP == nil {
			return nil, httperr.NewBadRequest("bad-ip", "Error parsing ip address: ip and mask have different lengths.")
		}
		if maskedBits < 8 {
			return nil, httperr.NewBadRequest("bad-ip", "IP subnet too large.")
		}
	} else {
		ip = net.ParseIP(addr)
		if ip == nil {
			return nil, httperr.NewBadRequest("bad-ip", fmt.Sprintf("Error parsing IP address: '%s' is not a valid IP address.", addr))
		}
		lastIP = ip
	}

	if ip.To4() != nil {
		if maskedBits == 32 {
			maskedBits = 0
		}
	} else {
		if maskedBits == 128 {
			maskedBits = 0
		}
	}

	if exists, err := blockExists(ctx, bl.db, ip, maskedBits); err != nil {
		return nil, err
	} else if exists {
		return nil, httperr.NewBadRequest("block-duplicate", "IP block already exists.")
	}

	associatedUsers, err := getUsersLastSeenBetweenIPs(ctx, bl.db, ip, lastIP)
	if err != nil {
		return nil, err
	}
	associatedUsersJson, _ := json.Marshal(associatedUsers)

	var notePtr *string
	if note != "" {
		notePtr = &note
	}

	query, args := msql.BuildInsertQuery("ipblocks", []msql.ColumnValue{
		{Name: "ip", Value: ip.String()},
		{Name: "masked_bits", Value: maskedBits},
		{Name: "created_by", Value: blockedBy},
		{Name: "expires_at", Value: expiresAt},
		{Name: "associated_users", Value: associatedUsersJson},
		{Name: "note", Value: notePtr},
	})

	res, err := bl.db.Exec(query, args...)
	if err != nil {
		return nil, err
	}

	lastInsertId, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	block, err := GetIPBlock(ctx, bl.db, int(lastInsertId))
	if err != nil {
		return nil, err
	}

	if err = bl.insert(block); err != nil {
		return nil, err
	}

	return block, nil
}

func (bl *Blocker) CancelBlock(ctx context.Context, blockID int) error {
	block, err := GetIPBlock(ctx, bl.db, blockID)
	if err != nil {
		return err
	}

	if !block.InEffect {
		return errors.New("block not in effect")
	}

	return msql.Transact(ctx, bl.db, func(tx *sql.Tx) error {
		now := time.Now()
		_, err := tx.Exec("UPDATE ipblocks SET in_effect = false, cancelled_at = ? WHERE id = ? AND in_effect = true", now, blockID)
		if err != nil {
			return err
		}
		return bl.remove(block)
	})
}

func (bl *Blocker) CancelExpiredBlocks(ctx context.Context) (int, error) {
	numCancelled := 0
	err := msql.Transact(ctx, bl.db, func(tx *sql.Tx) error {
		rows, err := tx.QueryContext(ctx, buildIPBlocksSelectQuery("WHERE ipblocks.in_effect = true AND ipblocks.expires_at <= current_timestamp()"))
		if err != nil {
			return err
		}

		blocks, err := scanIPBlocks(rows)
		if err != nil {
			return err
		}

		if len(blocks) == 0 {
			return nil
		}

		var ids []any
		for _, block := range blocks {
			ids = append(ids, block.ID)
		}

		if _, err := tx.ExecContext(ctx, fmt.Sprintf("UPDATE ipblocks SET in_effect = false WHERE id IN %s", msql.InClauseQuestionMarks(len(ids))), ids...); err != nil {
			return err
		}

		for _, block := range blocks {
			if err := bl.remove(block); err != nil {
				return err
			}
			numCancelled++
		}

		return nil
	})
	return numCancelled, err
}

func (bl *Blocker) Len() int {
	bl.mu.Lock()
	defer bl.mu.Unlock()
	return bl.blockedNetworks.Len() + len(bl.blockedIPs)
}

func (bl *Blocker) CancelAllBlocks(ctx context.Context) error {
	_, err := bl.db.ExecContext(ctx, "UPDATE ipblocks SET in_effect = false WHERE in_effect = true")
	if err != nil {
		return err
	}
	return bl.LoadDatabaseBlocks(ctx)
}

type Block struct {
	ID int `json:"id"`

	IP net.IP `json:"ip"` // Always 16 bytes in length.

	// For IPv4-mapped addresses, this value is always between 0 and 32. For
	// regular IPv6 addresses, it's always between 0-128. A zero value would
	// indicate that the IP is not a network but a host.
	MaskedBits int `json:"maskedBits"`

	CreatedAt       time.Time `json:"createdAt"`
	createdBy       uid.ID
	CreatedBy       string     `json:"createdBy"`
	ExpiresAt       *time.Time `json:"expiresAt"`
	CancelledAt     *time.Time `json:"cancelledAt"`
	InEffect        bool       `json:"inEffect"`
	AssociatedUsers []string   `json:"associatedUsers"`
	Note            string     `json:"note"`
}

func (b *Block) IsIPv4() bool {
	return b.IP.To4() != nil
}

func (b *Block) IsNetwork() bool {
	return b.MaskedBits != 0
}

func (b *Block) IPNet() net.IPNet {
	bitsize := 128
	ip := net.IP{}
	if b.IsIPv4() {
		bitsize = 32
		ip = b.IP.To4()
	}
	return net.IPNet{
		IP:   ip,
		Mask: net.CIDRMask(b.MaskedBits, bitsize),
	}
}

func blockExists(ctx context.Context, db *sql.DB, ip net.IP, maskedBits int) (bool, error) {
	var id int
	err := db.QueryRowContext(ctx, "SELECT id FROM ipblocks WHERE in_effect = true AND ip = ? AND masked_bits = ? LIMIT 1", ip.String(), maskedBits).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func getUsersLastSeenBetweenIPs(ctx context.Context, db *sql.DB, first, last net.IP) ([]string, error) {
	rows, err := db.QueryContext(ctx, "SELECT username FROM users WHERE last_seen_ip >= ? AND last_seen_ip <= ?", first.String(), last.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var user string
		if err := rows.Scan(&user); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func buildIPBlocksSelectQuery(where string) string {
	var columns = []string{
		"ipblocks.id",
		"ipblocks.ip",
		"ipblocks.masked_bits",
		"ipblocks.created_at",
		"ipblocks.created_by",
		"ipblocks.expires_at",
		"ipblocks.cancelled_at",
		"ipblocks.in_effect",
		"ipblocks.associated_users",
		"ipblocks.note",
		"users.username",
	}
	return msql.BuildSelectQuery("ipblocks", columns, []string{
		"INNER JOIN users ON ipblocks.created_by = users.id",
	}, where)
}

type ResultSet struct {
	Blocks []*Block `json:"blocks"`
	Next   *string  `json:"next"`
}

type InEffect string

var (
	InEffectInEffect    = InEffect("InEffect")
	InEffectNotInEffect = InEffect("NotInEffect")
	InEffectAll         = InEffect("InEffectAll")
)

func (ie InEffect) Valid() bool {
	return slices.Contains([]InEffect{InEffectInEffect, InEffectNotInEffect, InEffectAll}, ie)
}

var errInvalidInEffect = httperr.NewBadRequest("invalid-in-effect", "Invalid in_effect parameter.")
var errInvalidResultSetNextValue = httperr.NewBadRequest("invalid-next-value", "Invalid next parameter.")

func GetAllIPBlocks(ctx context.Context, db *sql.DB, inEffect InEffect, limit int, next string) (*ResultSet, error) {
	if !inEffect.Valid() {
		return nil, errInvalidInEffect
	}

	var (
		where string
		args  []any
	)

	if inEffect != InEffectAll {
		var s = "true"
		if inEffect == InEffectNotInEffect {
			s = "false"
		}
		where = fmt.Sprintf("WHERE ipblocks.in_effect = %s", s)
	}

	type cursorData struct {
		InEffect bool `json:"inEffect"`
		ID       int  `json:"id"`
	}

	limitS := ""
	if limit > 0 {
		if next != "" {
			_next := cursorData{}
			b, err := hex.DecodeString(next)
			if err != nil {
				return nil, errInvalidResultSetNextValue
			}
			if err := json.Unmarshal(b, &_next); err != nil {
				return nil, errInvalidResultSetNextValue
			}
			if inEffect == InEffectAll {
				where = "WHERE ipblocks.in_effect = ? AND ipblocks.id < ?"
				args = append(args, _next.InEffect, _next.ID)
			} else {
				where = " AND ipblocks.id < ?"
				args = append(args, _next.ID)
			}
		}
		limitS = fmt.Sprintf("LIMIT %d", limit+1)
	}

	where = fmt.Sprintf("%s ORDER BY ipblocks.in_effect DESC, ipblocks.id DESC %s", where, limitS)
	rows, err := db.QueryContext(ctx, buildIPBlocksSelectQuery(where), args...)
	if err != nil {
		return nil, err
	}

	blocks, err := scanIPBlocks(rows)
	if err != nil {
		return nil, err
	}

	if blocks == nil {
		blocks = []*Block{} // for json '[]' marshalling
	}

	rset := &ResultSet{
		Blocks: blocks,
	}

	if limit > 0 && len(blocks) > limit {
		next := cursorData{
			InEffect: blocks[limit].InEffect,
			ID:       blocks[limit].ID,
		}
		b, _ := json.Marshal(next)
		s := hex.EncodeToString(b)
		rset.Next = &s
		rset.Blocks = blocks[:limit]
	}

	return rset, nil
}

func scanIPBlocks(rows *sql.Rows) ([]*Block, error) {
	defer rows.Close()

	blocks := []*Block{}
	for rows.Next() {
		var (
			b                       = &Block{}
			associatedUsersJson, ip string
			note                    *string
		)
		if err := rows.Scan(
			&b.ID,
			&ip,
			&b.MaskedBits,
			&b.CreatedAt,
			&b.createdBy,
			&b.ExpiresAt,
			&b.CancelledAt,
			&b.InEffect,
			&associatedUsersJson,
			&note,
			&b.CreatedBy,
		); err != nil {
			return nil, err
		}
		if b.IP = net.ParseIP(ip); b.IP == nil {
			return nil, fmt.Errorf("scanning IP %s is nil", ip)
		}
		if err := json.Unmarshal([]byte(associatedUsersJson), &b.AssociatedUsers); err != nil {
			return nil, fmt.Errorf("error unmarshaling ipblocks.associated_users (id: %d)", b.ID)
		}
		if b.AssociatedUsers == nil {
			b.AssociatedUsers = []string{} // so that JSON of this field will never be null
		}
		if note != nil {
			b.Note = *note
		}
		blocks = append(blocks, b)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return blocks, nil
}

func GetIPBlock(ctx context.Context, db *sql.DB, rowID int) (*Block, error) {
	rows, err := db.QueryContext(ctx, buildIPBlocksSelectQuery("WHERE ipblocks.id = ?"), rowID)
	if err != nil {
		return nil, err
	}

	blocks, err := scanIPBlocks(rows)
	if err != nil {
		return nil, err
	}

	if len(blocks) != 1 {
		return nil, fmt.Errorf("single IPBlock fetch length is not 1 but %d", len(blocks))
	}

	return blocks[0], nil
}

// lastIPAddress returns the last IP address of the network. If the IP address
// and the mask are of different lengths, it returns nil.
func lastIPAddress(network *net.IPNet) net.IP {
	if len(network.IP) != len(network.Mask) {
		return nil
	}
	ip := make(net.IP, len(network.IP))
	for i := range network.Mask {
		ip[i] = network.IP[i] | ^network.Mask[i]
	}
	return ip.To16()
}
