package controllers

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"fund-management-api/models"
)

func TestBuildApplicantNameIncludesPrefix(t *testing.T) {
	prefix := "Dr."
	user := &models.User{
		UserFname: "Jane",
		UserLname: "Doe",
		Prefix:    &prefix,
	}

	got := buildApplicantName(user)
	if got != "Dr. Jane Doe" {
		t.Fatalf("expected 'Dr. Jane Doe', got %q", got)
	}
}

func TestApplicantNameReplacementInDocxIncludesPrefix(t *testing.T) {
	prefix := "Prof."
	user := &models.User{
		UserFname: "Alex",
		UserLname: "Smith",
		Prefix:    &prefix,
	}

	applicantName := buildApplicantName(user)

	templatePath := createMinimalDocxTemplate(t)

	tmpDir := t.TempDir()
	outputDocx := filepath.Join(tmpDir, "out.docx")

	replacements := map[string]string{
		"{{applicant_name}}": applicantName,
	}

	if err := fillDocxTemplate(templatePath, outputDocx, replacements); err != nil {
		t.Fatalf("fillDocxTemplate returned error: %v", err)
	}

	reader, err := zip.OpenReader(outputDocx)
	if err != nil {
		t.Fatalf("failed to open generated docx: %v", err)
	}
	defer reader.Close()

	var documentXML string
	for _, file := range reader.File {
		if file.Name != "word/document.xml" {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			t.Fatalf("failed to open document.xml: %v", err)
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			t.Fatalf("failed to read document.xml: %v", err)
		}
		documentXML = string(data)
		break
	}

	if documentXML == "" {
		t.Fatalf("document.xml not found in generated docx")
	}

	if !strings.Contains(documentXML, applicantName) {
		t.Fatalf("expected applicant name %q to appear in document.xml", applicantName)
	}
}

func createMinimalDocxTemplate(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()
	templatePath := filepath.Join(dir, "template.docx")

	file, err := os.Create(templatePath)
	if err != nil {
		t.Fatalf("failed to create template: %v", err)
	}

	writer := zip.NewWriter(file)

	writeEntry := func(name, content string) {
		header := &zip.FileHeader{Name: name, Method: zip.Deflate}
		entry, err := writer.CreateHeader(header)
		if err != nil {
			t.Fatalf("failed to create entry %s: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatalf("failed to write entry %s: %v", name, err)
		}
	}

	writeEntry("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`)

	writeEntry("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="R1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

	writeEntry("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{applicant_name}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`)

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to finalize template: %v", err)
	}

	if err := file.Close(); err != nil {
		t.Fatalf("failed to close template: %v", err)
	}

	return templatePath
}
