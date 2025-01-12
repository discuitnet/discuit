package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"math/rand"
	"strconv"
	"strings"
)

// GenerateStringID returns a random string containing only the following
// letters: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_
func GenerateStringID(length int) string {
	var (
		l  = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_"
		nl = len(l)
		id = ""
	)
	for i := 0; i < length; i++ {
		id = id + string(l[rand.Intn(nl)])
	}
	return id
}

// ValidMAC reports whether messageMAC64 (base64) is a valid HMAC tag for
// message.
func ValidMAC(message, messageMAC64, key string) (bool, error) {
	mac := hmac.New(sha256.New, []byte(key))
	if _, err := io.WriteString(mac, message); err != nil {
		return false, err
	}
	expectedMAC := mac.Sum(nil)
	mhmac, err := base64.URLEncoding.DecodeString(messageMAC64)
	if err != nil {
		return false, err
	}
	return hmac.Equal(mhmac, expectedMAC), nil
}

func NewHMAC(message, key string) string {
	hash := hmac.New(sha256.New, []byte(key))
	io.WriteString(hash, message)
	return base64.URLEncoding.EncodeToString(hash.Sum(nil))
}

func GenerateSenetence(wc int) string {
	words := []string{
		"bizarre",
		"honorable",
		"excellent",
		"phobic",
		"hop",
		"desire",
		"helpful",
		"machine",
		"medical",
		"object",
		"wound",
		"press",
		"butter",
		"belong",
		"vulgar",
		"quicksand",
		"glow",
		"death",
		"release",
		"hobbies",
		"even",
		"detail",
		"womanly",
		"premium",
		"crayon",
		"soft",
		"thought",
		"obey",
		"distinct",
		"dress",
		"tick",
		"crate",
		"coach",
		"opposite",
		"earth",
		"overwrought",
		"quixotic",
		"wheel",
		"gifted",
		"temper",
		"joke",
		"wish",
		"fairies",
		"royal",
		"stomach",
		"deafening",
		"dislike",
		"tramp",
		"branch",
		"marked",
		"handy",
		"meaty",
		"mindless",
		"representative",
		"puzzling",
		"kettle",
		"mass",
		"hollow",
		"look",
		"depressed",
		"tax",
		"voracious",
		"fretful",
		"risk",
		"arrogant",
		"crawl",
		"wonder",
		"magic",
		"bite",
		"mother",
		"hands",
		"ladybug",
		"damage",
		"disagreeable",
		"hole",
		"twist",
		"elbow",
		"bit",
		"believe",
		"maid",
		"discussion",
		"assorted",
		"mint",
		"handsomely",
		"yard",
		"current",
		"underwear",
		"necessary",
		"show",
		"develop",
		"square",
		"stupid",
		"canvas",
		"deranged",
		"drop",
		"messy",
		"poison",
		"uneven",
		"follow",
		"volcano",
	}
	s := strings.Title(words[rand.Int()%len(words)])
	for i := 0; i < wc; i++ {
		s += " " + words[rand.Int()%len(words)]
	}
	s += "."
	return s
}

func GenerateText() string {
	nsLow, nsHigh := 1, 7
	wcLow, wcHigh := 4, 20
	ns := nsLow + (rand.Int() % (nsHigh - nsLow))
	s := ""
	for i := 0; i < ns; i++ {
		if i != 0 {
			s += " "
		}
		wc := wcLow + (rand.Int() % (wcHigh - wcLow))
		s += GenerateSenetence(wc)
	}
	return s
}

// TruncateUnicodeString truncates s to a max length of length. It also
// guarantees that the returned string is of valid utf-8.
func TruncateUnicodeString(s string, length int) string {
	s = strings.ToValidUTF8(s, "")
	runes := []rune(s)
	if len(runes) > length {
		return string(runes[:length])
	}
	return s
}

// ExtractStringsFromMap returns a new map with all the string values from m. If
// trim is true, the string values of the returned map are space trimmed.
func ExtractStringsFromMap(m map[string]any, trim bool) map[string]string {
	strMap := make(map[string]string)
	for key, val := range m {
		if strVal, ok := val.(string); ok {
			if trim {
				strVal = strings.TrimSpace(strVal)
			}
			strMap[key] = strVal
		}
	}
	return strMap
}

func StringCount(number int, thingName, thingNameMultiple string, excludeNumber bool) string {
	var s string
	if !excludeNumber {
		s = strconv.Itoa(number) + " "
	}
	if thingNameMultiple == "" {
		thingNameMultiple = thingName + "s"
	}
	if number == 1 {
		s += thingName
	} else {
		s += thingNameMultiple
	}
	return s
}
