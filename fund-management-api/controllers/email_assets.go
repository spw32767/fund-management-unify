package controllers

import (
	"encoding/base64"
	"fmt"
	"html/template"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const (
	emailLogoRelativePath = "templates/email_assets/fund_cpkku_logo.png"
	emailLogoEnvPath      = "EMAIL_LOGO_PATH"
	emailLogoEnvURL       = "EMAIL_LOGO_URL"
)

var (
	emailLogoOnce sync.Once
	emailLogoHTML string
)

func getEmailLogoHTML() string {
	emailLogoOnce.Do(func() {
		if url := strings.TrimSpace(os.Getenv(emailLogoEnvURL)); url != "" {
			emailLogoHTML = fmt.Sprintf(
				`<img src="%s" alt="ระบบบริหารจัดการทุนวิจัย" style="display:block;width:72px;height:auto;margin:0 auto 18px auto;" />`,
				template.HTMLEscapeString(url),
			)
			return
		}

		path, err := resolveEmailLogoPath()
		if err != nil {
			log.Printf("email header logo not loaded: %v", err)
			emailLogoHTML = ""
			return
		}

		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("email header logo not found at %s: %v", path, err)
			emailLogoHTML = ""
			return
		}
		encoded := base64.StdEncoding.EncodeToString(data)
		emailLogoHTML = fmt.Sprintf(
			`<img src="data:image/png;base64,%s" alt="ระบบบริหารจัดการทุนวิจัย" style="display:block;width:72px;height:auto;margin:0 auto 18px auto;" />`,
			encoded,
		)
	})
	return emailLogoHTML
}

func resolveEmailLogoPath() (string, error) {
	override := strings.TrimSpace(os.Getenv(emailLogoEnvPath))

	candidates := make([]string, 0, 6)
	if override != "" {
		candidates = append(candidates, override)
		candidates = append(candidates, emailLogoRelativePath)
	} else {
		candidates = append(candidates, emailLogoRelativePath)
	}

	baseDirs := []string{""}
	if wd, err := os.Getwd(); err == nil {
		baseDirs = append(baseDirs, wd)
	}
	if exe, err := os.Executable(); err == nil {
		execDir := filepath.Dir(exe)
		baseDirs = append(baseDirs, execDir)
		baseDirs = append(baseDirs, filepath.Dir(execDir))
		baseDirs = append(baseDirs, filepath.Dir(filepath.Dir(execDir)))
	}

	tried := make([]string, 0, len(candidates)*len(baseDirs))
	var lastErr error
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if filepath.IsAbs(candidate) {
			if _, err := os.Stat(candidate); err == nil {
				return candidate, nil
			}
			tried = append(tried, candidate)
			lastErr = err
			continue
		}

		for _, base := range baseDirs {
			path := candidate
			if base != "" {
				path = filepath.Join(base, candidate)
			}
			tried = append(tried, path)
			if _, err := os.Stat(path); err == nil {
				return path, nil
			}
			lastErr = err
		}
	}

	if lastErr != nil {
		return "", fmt.Errorf("logo file not found (tried %s): %w", strings.Join(tried, ", "), lastErr)
	}
	return "", fmt.Errorf("logo file not found (tried %s)", strings.Join(tried, ", "))
}
