// Package httputil provides HTTP utility functions.
package httputil

import (
	"io"
	"net"
	"net/http"
	"time"

	"golang.org/x/net/html"
)

// GetIP returns the IP address associated with r.
func GetIP(r *http.Request) string {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}

var httpClient = &http.Client{
	Timeout: time.Second * 6,
}

const (
	userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0"
)

// Get fetches the file at url with an ordinary looking User-Agent. Make sure to
// close the http.Response.Body.
func Get(url string) (*http.Response, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	return httpClient.Do(req)
}

// ExtractOpenGraphImage returns the Open Graph image tag of the HTML document in r.
func ExtractOpenGraphImage(r io.Reader) (string, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return "", err
	}

	var f func(*html.Node)
	imageURL := ""
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "meta" {
			for _, meta := range n.Attr {
				if meta.Key == "property" && meta.Val == "og:image" {
					for _, attr := range n.Attr {
						if attr.Key == "content" {
							imageURL = attr.Val
							return
						}
					}
					return
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)

	return imageURL, nil
}

// ExtractOGTItle returns the Open Graph title tag found in the HTML document in r.
func ExtractOpenGraphTitle(r io.Reader) (string, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return "", err
	}

	var f func(*html.Node)
	title := ""
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "meta" {
			for _, meta := range n.Attr {
				if meta.Key == "property" && meta.Val == "og:title" {
					for _, attr := range n.Attr {
						if attr.Key == "content" {
							title = attr.Val
							return
						}
					}
					return
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)

	return title, nil
}
