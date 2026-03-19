package services

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ScholarPub struct {
	Title            string         `json:"title"`
	Authors          []string       `json:"authors"`
	Venue            *string        `json:"venue"`
	Year             *int           `json:"year"`
	URL              *string        `json:"url"`
	DOI              *string        `json:"doi"`
	ScholarClusterID *string        `json:"scholar_cluster_id"`
	NumCitations     *int           `json:"num_citations"`
	CitedByURL       *string        `json:"citedby_url"`
	CitesPerYear     map[string]int `json:"cites_per_year"`
}

// Runs: python3 scripts/scholarly_fetch.py <AUTHOR_ID>
// Returns parsed JSON from the script.
func FetchScholarOnce(authorID string) ([]ScholarPub, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	py := strings.TrimSpace(os.Getenv("VENV_PY"))
	if py == "" {
		py = "python3" // fallback
	}

	script := resolveScholarScriptPath("SCHOLAR_SCRIPT", "scripts/scholarly_fetch.py")

	cmd := exec.CommandContext(ctx, py, script, authorID)

	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var pubs []ScholarPub
	if err := json.Unmarshal(out, &pubs); err != nil {
		return nil, err
	}
	return pubs, nil
}

type ScholarAuthorHit struct {
	AuthorID    string   `json:"author_id"`
	Name        string   `json:"name"`
	Affiliation *string  `json:"affiliation"`
	Interests   []string `json:"interests"`
	CitedBy     *int     `json:"citedby"`
	ProfileURL  *string  `json:"profile_url"`
}

func SearchScholarAuthors(query string) ([]ScholarAuthorHit, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	py := strings.TrimSpace(os.Getenv("VENV_PY"))
	if py == "" {
		py = "python3"
	}

	// allow override via env; fallback to repo path
	script := resolveScholarScriptPath("SCHOLAR_SEARCH_SCRIPT", "scripts/scholar_search_authors.py")

	cmd := exec.CommandContext(ctx, py, script, query)
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var hits []ScholarAuthorHit
	if e := json.Unmarshal(out, &hits); e != nil {
		return nil, e
	}
	return hits, nil
}

type ScholarAuthorIndices struct {
	HIndex       *int           `json:"hindex"`
	HIndex5Y     *int           `json:"hindex5y"`
	I10Index     *int           `json:"i10index"`
	I10Index5Y   *int           `json:"i10index5y"`
	CitedByTotal *int           `json:"citedby_total"`
	CitedBy5Y    *int           `json:"citedby_5y"`
	CitesPerYear map[string]int `json:"cites_per_year"`
}

// Runs: python3 scripts/scholar_author_indices.py <AUTHOR_ID>
func FetchScholarAuthorIndices(authorID string) (*ScholarAuthorIndices, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	py := strings.TrimSpace(os.Getenv("VENV_PY"))
	if py == "" {
		py = "python3"
	}
	script := resolveScholarScriptPath("SCHOLAR_AUTHOR_SCRIPT", "scripts/scholar_author_indices.py")

	cmd := exec.CommandContext(ctx, py, script, authorID)
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var ai ScholarAuthorIndices
	if err := json.Unmarshal(out, &ai); err != nil {
		return nil, err
	}
	return &ai, nil
}

func resolveScholarScriptPath(envKey, defaultRel string) string {
	if val := strings.TrimSpace(os.Getenv(envKey)); val != "" {
		return val
	}

	if defaultRel == "" {
		return ""
	}

	if filepath.IsAbs(defaultRel) {
		if _, err := os.Stat(defaultRel); err == nil {
			return defaultRel
		}
		return defaultRel
	}

	candidates := []string{""}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, wd)
	}
	if exePath, err := os.Executable(); err == nil {
		dir := filepath.Dir(exePath)
		for i := 0; i < 5; i++ {
			candidates = append(candidates, dir)
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}

	seen := make(map[string]struct{})
	for _, base := range candidates {
		path := defaultRel
		if strings.TrimSpace(base) != "" {
			path = filepath.Join(base, defaultRel)
		}
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		if _, err := os.Stat(path); err == nil {
			if abs, err := filepath.Abs(path); err == nil {
				return abs
			}
			return path
		}
	}

	return defaultRel
}
