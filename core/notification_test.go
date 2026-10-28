package core

import (
	"context"
	"testing"
)

func TestEncloseInBold(t *testing.T) {
	cases := []struct {
		format TextFormat
		text   string
		want   string
	}{
		{TextFormatsHTML, "Hello world", "<b>Hello world</b>"},
		{TextFormatsHTML, "<img src=x onerror=alert(1)>", "<b>&lt;img src=x onerror=alert(1)&gt;</b>"},
		{TextFormatsHTML, "</b><script>alert(1)</script>", "<b>&lt;/b&gt;&lt;script&gt;alert(1)&lt;/script&gt;</b>"},
		{TextFormatsHTML, `"Tom" & 'Jerry'`, "<b>&#34;Tom&#34; &amp; &#39;Jerry&#39;</b>"},
		{TextFormatsHTML, "&lt;b&gt;", "<b>&amp;lt;b&amp;gt;</b>"},
		{TextFormatsMarkdown, "<b>x</b>", "**<b>x</b>**"},
		{"", "<b>x</b>", "<b>x</b>"},
	}
	for _, item := range cases {
		if got := encloseInBold(item.format, item.text); got != item.want {
			t.Errorf("encloseInBold(%q, %q) = %q, want %q", item.format, item.text, got, item.want)
		}
	}
}

func TestNotificationDeniedCommView(t *testing.T) {
	n := NotificationDeniedComm{Body: "<img src=x onerror=alert(1)>"}
	cases := []struct {
		format TextFormat
		want   string
	}{
		{TextFormatsHTML, "&lt;img src=x onerror=alert(1)&gt;"},
		{"", "<img src=x onerror=alert(1)>"},
	}
	for _, item := range cases {
		view, err := n.view(context.Background(), nil, item.format)
		if err != nil {
			t.Fatal(err)
		}
		if view.Title != item.want {
			t.Errorf("view title (format: %q) = %q, want %q", item.format, view.Title, item.want)
		}
	}
}

func TestNotificationModAddView(t *testing.T) {
	n := NotificationModAdd{CommunityName: "<i>x</i>", AddedBy: "<i>y</i>"}
	view, err := n.view(context.Background(), nil, TextFormatsHTML)
	if err != nil {
		t.Fatal(err)
	}
	want := "You are added as a moderator of &lt;i&gt;x&lt;/i&gt; by <b>@&lt;i&gt;y&lt;/i&gt;</b>"
	if view.Title != want {
		t.Errorf("view title = %q, want %q", view.Title, want)
	}
}
