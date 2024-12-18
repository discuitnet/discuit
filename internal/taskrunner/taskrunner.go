package taskrunner

import (
	"context"
	"log"
	"sync"
	"time"
)

type task struct {
	name      string
	fn        func(context.Context) error
	period    time.Duration
	waitFirst bool
	done      chan struct{}
	noLogging bool
}

func (t *task) run(ctx context.Context, done <-chan struct{}) {
	for {
		if !t.waitFirst {
			t.once(ctx)
		}
		select {
		case <-done:
			if !t.noLogging {
				log.Printf("Exiting task job: %s\n", t.name)
			}
			t.done <- struct{}{}
			return
		case <-time.After(t.period):
			// continue
		}
		if t.waitFirst {
			t.once(ctx)
		}
	}
}

// once runs the task once
func (t *task) once(ctx context.Context) {
	if err := t.fn(ctx); err != nil {
		if !t.noLogging {
			log.Printf("Error running task %s: %v\n", t.name, err)
		}
	}
}

// TaskRunner runs a set of tasks in the background (in parallel).
type TaskRunner struct {
	NoLogging bool
	tasks     []*task
	ctx       context.Context
	cancel    context.CancelFunc // for force stops
	done      chan struct{}
}

func New(ctx context.Context) *TaskRunner {
	tr := &TaskRunner{done: make(chan struct{})}
	tr.ctx, tr.cancel = context.WithCancel(ctx)
	return tr
}

func (tr *TaskRunner) New(name string, fn func(context.Context) error, period time.Duration, waitFirst bool) {
	tr.tasks = append(tr.tasks, &task{
		name:      name,
		fn:        fn,
		period:    period,
		done:      make(chan struct{}),
		waitFirst: waitFirst,
	})
}

// Start starts all the task jobs in the background. The function doesn't block
// and returns immediately.
func (tr *TaskRunner) Start() {
	for _, task := range tr.tasks {
		log.Printf("Starting task job: %s\n", task.name)
		go task.run(tr.ctx, tr.done)
	}
}

// Stop stops all the running tasks. It is blocking. If the provided context
// expires before all the tasks are completed, Stop returns immediately with the
// context's error.
func (tr *TaskRunner) Stop(ctx context.Context) error {
	close(tr.done)

	var wg sync.WaitGroup
	for _, t := range tr.tasks {
		wg.Add(1)
		go func(t *task) { // close in parallel
			<-t.done // wait
			wg.Done()
		}(t)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		tr.cancel()
		return ctx.Err()
	}
}
