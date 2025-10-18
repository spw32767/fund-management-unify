package controllers

import "testing"

func TestAggregateDocumentLinesByTypeID(t *testing.T) {
	sources := []documentLineSource{
		{key: "type:1", name: "เอกสารอื่นๆ", order: 10, hasOrder: true},
		{key: "type:1", name: "เอกสารอื่นๆ", order: 20, hasOrder: true},
	}

	if got := aggregateDocumentLines(sources); got != "เอกสารอื่นๆ จำนวน 2 ฉบับ" {
		t.Fatalf("unexpected aggregated line: %q", got)
	}
}

func TestAggregateDocumentLinesByNameFallback(t *testing.T) {
	sources := []documentLineSource{
		{key: "", name: "เอกสารเบิกจ่ายภายนอก", hasOrder: false},
		{key: "", name: "เอกสารเบิกจ่ายภายนอก", hasOrder: false},
	}

	if got := aggregateDocumentLines(sources); got != "เอกสารเบิกจ่ายภายนอก จำนวน 2 ฉบับ" {
		t.Fatalf("unexpected aggregated line: %q", got)
	}
}

func TestAggregateDocumentLinesMixedKeys(t *testing.T) {
	sources := []documentLineSource{
		{key: "type:1", name: "เอกสารอื่นๆ", order: 5, hasOrder: true},
		{key: "", name: "เอกสารอื่นๆ", order: 50, hasOrder: true},
		{key: "type:1", name: "เอกสารอื่นๆ", order: 1, hasOrder: true},
	}

	expected := "เอกสารอื่นๆ จำนวน 3 ฉบับ"
	if got := aggregateDocumentLines(sources); got != expected {
		t.Fatalf("expected %q, got %q", expected, got)
	}
}
