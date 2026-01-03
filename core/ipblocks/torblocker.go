package ipblocks

import (
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type torBlocker struct {
	mu       sync.Mutex // guards the below
	ips      map[string]struct{}
	interval time.Duration // for auto updating the list of ips
	blocking bool
	done     chan struct{}
}

func newTorBlocker() *torBlocker {
	return &torBlocker{
		ips:      make(map[string]struct{}),
		interval: time.Minute * 15,
	}
}

func (tb *torBlocker) updateTorIPs() error {
	res, err := http.Get("https://check.torproject.org/torbulkexitlist")
	if err != nil {
		return err
	}
	defer res.Body.Close()

	bytes, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}

	var lines []string
	for _, line := range strings.Split(string(bytes), "\n") {
		if strings.TrimSpace(line) != "" {
			lines = append(lines, line)
		}
	}

	tb.mu.Lock()
	defer tb.mu.Unlock()

	for _, addr := range lines {
		tb.ips[addr] = struct{}{}
	}

	return nil
}

func (tb *torBlocker) Block() {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	if tb.blocking {
		return
	}

	tb.done = make(chan struct{})
	tb.blocking = true

	go func() {
		for {
			if err := tb.updateTorIPs(); err != nil {
				// Log error and continue.
				log.Printf("Error updating Tor exist node IPs: %v\n", err)
			}

			select {
			case <-time.After(tb.interval):
				// continue
			case <-tb.done:
				return
			}
		}

	}()
}

func (tb *torBlocker) Unblock() {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	if tb.blocking {
		tb.ips = make(map[string]struct{})
		close(tb.done)
		tb.done = nil
		tb.blocking = false
	}
}

func (tb *torBlocker) Blocked() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	return tb.blocking
}

func (bl *torBlocker) Match(addr string) bool {
	bl.mu.Lock()
	defer bl.mu.Unlock()
	_, ok := bl.ips[addr]
	return ok
}

func (tb *torBlocker) Close() {
	tb.Unblock()
}
