package services

import (
	"database/sql/driver"
	"regexp"
	"testing"
)

func TestScopusPublicationServiceStatsByUserDeduplicatesEIDs(t *testing.T) {
	steps := []*queryStep{
		{
			kind:    kindQuery,
			pattern: regexp.MustCompile(`SELECT .*Scopus_id.*FROM .*` + "`users`"),
			args:    []driver.Value{int64(1)},
			columns: []string{"Scopus_id"},
			rows: [][]driver.Value{{
				"12345",
			}},
		},
		{
			kind:    kindQuery,
			pattern: regexp.MustCompile(`SELECT .* FROM .*` + "`scopus_authors`"),
			args:    []driver.Value{"12345"},
			columns: []string{"id"},
			rows: [][]driver.Value{{
				int64(1),
			}},
		},
		{
			kind:    kindQuery,
			pattern: regexp.MustCompile(`(?s)SELECT count\(.*\).*scopus_documents`),
			args:    []driver.Value{int64(1)},
			columns: []string{"count"},
			rows: [][]driver.Value{{
				int64(2),
			}},
		},
		{
			kind:    kindQuery,
			pattern: regexp.MustCompile(`(?s)SELECT count\(.*\).*dedup_eid`),
			args:    []driver.Value{int64(1)},
			columns: []string{"count"},
			rows: [][]driver.Value{{
				int64(1),
			}},
		},
		{
			kind:    kindQuery,
			pattern: regexp.MustCompile(`(?s)SELECT .*AS year.*dedup_eid`),
			args:    []driver.Value{int64(1)},
			columns: []string{"year", "documents", "citations"},
			rows: [][]driver.Value{{
				int64(2021), int64(1), int64(5),
			}},
		},
	}

	db, state, cleanup := newScriptedGormDB(t, steps)
	defer cleanup()

	svc := NewScopusPublicationService(db)
	stats, meta, err := svc.StatsByUser(1)
	if err != nil {
		t.Fatalf("StatsByUser returned error: %v", err)
	}

	if !meta.HasScopusID || !meta.HasAuthor {
		t.Fatalf("expected metadata to reflect scopus linkage")
	}

	if stats.TotalDocuments != 1 {
		t.Fatalf("expected 1 document, got %d", stats.TotalDocuments)
	}
	if stats.TotalCitations != 5 {
		t.Fatalf("expected citations counted once, got %d", stats.TotalCitations)
	}
	if len(stats.Trend) != 1 {
		t.Fatalf("expected single trend row, got %d", len(stats.Trend))
	}
	if stats.Trend[0].Documents != 1 {
		t.Fatalf("expected trend documents = 1, got %d", stats.Trend[0].Documents)
	}
	if stats.Trend[0].Citations != 5 {
		t.Fatalf("expected trend citations = 5, got %d", stats.Trend[0].Citations)
	}

	if err := state.verifyComplete(); err != nil {
		t.Fatalf("unexpected remaining queries: %v", err)
	}
}
