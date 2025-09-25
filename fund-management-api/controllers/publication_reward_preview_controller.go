package controllers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"fund-management-api/config"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type publicationRewardPreviewRequest struct {
	SubmissionID int `json:"submission_id" binding:"required"`
}

type publicationRewardPreviewData struct {
	SubmissionCreatedAt time.Time      `gorm:"column:submission_created_at"`
	UserFname           string         `gorm:"column:user_fname"`
	UserLname           string         `gorm:"column:user_lname"`
	DateOfEmployment    *time.Time     `gorm:"column:date_of_employment"`
	PositionName        sql.NullString `gorm:"column:position_name"`
	TotalAmount         sql.NullFloat64
	AuthorNameList      sql.NullString `gorm:"column:author_name_list"`
	PaperTitle          sql.NullString `gorm:"column:paper_title"`
	JournalName         sql.NullString `gorm:"column:journal_name"`
	PublicationDate     *time.Time     `gorm:"column:publication_date"`
	VolumeIssue         sql.NullString `gorm:"column:volume_issue"`
	PageNumbers         sql.NullString `gorm:"column:page_numbers"`
	AuthorType          sql.NullString `gorm:"column:author_type"`
	Quartile            sql.NullString `gorm:"column:quartile"`
	Signature           sql.NullString `gorm:"column:signature"`
}

type submissionDocumentLine struct {
	DocumentTypeName sql.NullString `gorm:"column:document_type_name"`
}

type systemConfigSnapshot struct {
	Installment   sql.NullInt64  `gorm:"column:installment"`
	KKUReportYear sql.NullString `gorm:"column:kku_report_year"`
}

func GeneratePublicationRewardPreview(c *gin.Context) {
	var req publicationRewardPreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "INVALID_PAYLOAD",
			"details": "submission_id is required",
		})
		return
	}

	var data publicationRewardPreviewData
	query := config.DB.Table("publication_reward_details AS prd").
		Select(`
            s.created_at AS submission_created_at,
            u.user_fname,
            u.user_lname,
            u.date_of_employment,
            p.position_name,
            prd.total_amount,
            prd.author_name_list,
            prd.paper_title,
            prd.journal_name,
            prd.publication_date,
            prd.volume_issue,
            prd.page_numbers,
            prd.author_type,
            prd.quartile,
            prd.signature
        `).
		Joins("JOIN submissions AS s ON prd.submission_id = s.submission_id").
		Joins("JOIN users AS u ON s.user_id = u.user_id").
		Joins("LEFT JOIN positions AS p ON u.position_id = p.position_id").
		Where("prd.submission_id = ?", req.SubmissionID)

	if err := query.Take(&data).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SUBMISSION_NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "FAILED_TO_FETCH_DATA"})
		return
	}

	cfg, err := fetchLatestSystemConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "FAILED_TO_FETCH_SYSTEM_CONFIG"})
		return
	}

	documents, err := fetchSubmissionDocuments(req.SubmissionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "FAILED_TO_FETCH_DOCUMENTS"})
		return
	}

	replacements := buildPreviewReplacements(data, cfg, documents)

	templatePath, err := resolveTemplatePath()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "TEMPLATE_NOT_AVAILABLE"})
		return
	}

	docxBytes, err := replacePlaceholdersInDocx(templatePath, replacements)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "DOCUMENT_RENDER_FAILED",
			"details": err.Error(),
		})
		return
	}

	pdfBytes, err := convertDocxToPDF(docxBytes)
	if err != nil {
		errMsg := err.Error()
		status := http.StatusInternalServerError
		code := "DOCX_TO_PDF_FAILED"
		if strings.HasPrefix(errMsg, "LIBREOFFICE_NOT_INSTALLED") {
			status = http.StatusServiceUnavailable
			code = "LIBREOFFICE_NOT_INSTALLED"
		}
		c.JSON(status, gin.H{
			"error":   code,
			"details": errMsg,
		})
		return
	}

	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func fetchLatestSystemConfig() (systemConfigSnapshot, error) {
	var cfg systemConfigSnapshot
	err := config.DB.Table("system_config").
		Select("installment, kku_report_year").
		Order("config_id DESC").
		Limit(1).
		Take(&cfg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return systemConfigSnapshot{}, nil
		}
		return systemConfigSnapshot{}, err
	}
	return cfg, nil
}

func fetchSubmissionDocuments(submissionID int) ([]submissionDocumentLine, error) {
	var documents []submissionDocumentLine
	err := config.DB.Table("submission_documents AS sd").
		Select("dt.document_type_name").
		Joins("JOIN document_types AS dt ON sd.document_type_id = dt.document_type_id").
		Joins("JOIN file_uploads AS fu ON sd.file_id = fu.file_id").
		Where("sd.submission_id = ?", submissionID).
		Order("dt.document_type_name ASC").
		Scan(&documents).Error
	if err != nil {
		return nil, err
	}
	return documents, nil
}

func buildPreviewReplacements(data publicationRewardPreviewData, cfg systemConfigSnapshot, documents []submissionDocumentLine) map[string]string {
	totalAmount := 0.0
	if data.TotalAmount.Valid {
		totalAmount = data.TotalAmount.Float64
	}

	totalAmountText := formatBahtText(totalAmount)
	totalAmountDisplay := formatThaiCurrency(totalAmount)

	authorRole := buildAuthorRole(nullString(data.AuthorType))
	quartileLine := buildQuartileLine(nullString(data.Quartile))
	documentLine := buildDocumentLine(documents)

	replacements := map[string]string{
		"{{date_th}}":            formatThaiDate(&data.SubmissionCreatedAt),
		"{{applicant_name}}":     strings.TrimSpace(data.UserFname + " " + data.UserLname),
		"{{date_of_employment}}": formatThaiDate(data.DateOfEmployment),
		"{{position}}":           nullString(data.PositionName),
		"{{installment}}":        formatInstallment(cfg.Installment),
		"{{total_amount}}":       totalAmountDisplay,
		"{{total_amount_text}}":  totalAmountText,
		"{{author_name_list}}":   nullString(data.AuthorNameList),
		"{{paper_title}}":        nullString(data.PaperTitle),
		"{{journal_name}}":       nullString(data.JournalName),
		"{{publication_date}}":   formatThaiDate(data.PublicationDate),
		"{{volume_issue}}":       nullString(data.VolumeIssue),
		"{{page_numbers}}":       nullString(data.PageNumbers),
		"{{author_role}}":        authorRole,
		"{{quartile_line}}":      quartileLine,
		"{{document_line}}":      documentLine,
		"{{kku_report_year}}":    nullString(cfg.KKUReportYear),
		"{{signature}}":          nullString(data.Signature),
	}

	return replacements
}

func nullString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

func formatInstallment(val sql.NullInt64) string {
	if !val.Valid {
		return ""
	}
	return fmt.Sprintf("%d", val.Int64)
}

func buildDocumentLine(documents []submissionDocumentLine) string {
	if len(documents) == 0 {
		return "☑ ไม่พบรายการเอกสารแนบ"
	}

	lines := make([]string, 0, len(documents))
	for _, doc := range documents {
		name := strings.TrimSpace(nullString(doc.DocumentTypeName))
		if name == "" {
			continue
		}
		lines = append(lines, fmt.Sprintf("☑ %s — จำนวน 1 ฉบับ", name))
	}

	if len(lines) == 0 {
		return "☑ ไม่พบรายการเอกสารแนบ"
	}

	return strings.Join(lines, "\n")
}

func buildAuthorRole(authorType string) string {
	switch authorType {
	case "first_author":
		return "เป็นผู้ประพันธ์ชื่อแรก (first author)"
	case "corresponding_author":
		return "เป็นผู้ประพันธ์บรรณกิจ (corresponding author)"
	default:
		return ""
	}
}

func buildQuartileLine(quartile string) string {
	switch quartile {
	case "T5":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 (ลำดับ 5% แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "T10":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 (ลำดับ 10% แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "Q1":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "Q2":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 2 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "Q3":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 3 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "Q4":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอไทล์ 4 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS"
	case "TCI":
		return "บทความตีพิมพ์ในวารสารระดับนานาชาติ อยู่ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI"
	default:
		return ""
	}
}

func formatThaiDate(t *time.Time) string {
	if t == nil {
		return ""
	}
	if t.IsZero() {
		return ""
	}

	thaiMonths := []string{"", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"}
	year := t.Year() + 543
	month := thaiMonths[int(t.Month())]
	day := t.Day()
	return fmt.Sprintf("%d %s %d", day, month, year)
}

func formatThaiCurrency(amount float64) string {
	formatted := fmt.Sprintf("%.2f", amount)
	parts := strings.Split(formatted, ".")
	integerPart := parts[0]
	decimalPart := "00"
	if len(parts) > 1 {
		decimalPart = parts[1]
	}

	sign := ""
	if strings.HasPrefix(integerPart, "-") {
		sign = "-"
		integerPart = integerPart[1:]
	}

	n := len(integerPart)
	if n <= 3 {
		return sign + integerPart + "." + decimalPart
	}

	var builder strings.Builder
	remainder := n % 3
	if remainder != 0 {
		builder.WriteString(integerPart[:remainder])
		builder.WriteString(",")
	}
	for i := remainder; i < n; i += 3 {
		builder.WriteString(integerPart[i : i+3])
		if i+3 < n {
			builder.WriteString(",")
		}
	}

	return sign + builder.String() + "." + decimalPart
}

func formatBahtText(amount float64) string {
	negative := amount < 0
	if negative {
		amount = -amount
	}

	text := bahtText(amount)
	if negative {
		return "ลบ" + text
	}
	return text
}

func bahtText(amount float64) string {
	rounded := fmt.Sprintf("%.2f", amount)
	parts := strings.Split(rounded, ".")
	integerPart := parts[0]
	satangPart := "00"
	if len(parts) > 1 {
		satangPart = parts[1]
	}

	integerText := convertThaiNumber(integerPart)
	if integerText == "" {
		integerText = "ศูนย์"
	}

	if satangPart == "00" {
		if integerText == "ศูนย์" {
			return "ศูนย์บาทถ้วน"
		}
		return integerText + "บาทถ้วน"
	}

	satangText := convertThaiNumber(satangPart)
	if satangText == "" {
		satangText = "ศูนย์"
	}

	return integerText + "บาท" + satangText + "สตางค์"
}

func convertThaiNumber(number string) string {
	number = strings.TrimLeft(number, "0")
	if number == "" {
		return ""
	}

	if len(number) > 6 {
		prefix := convertThaiNumber(number[:len(number)-6])
		suffix := convertThaiGroup(number[len(number)-6:])
		return prefix + "ล้าน" + suffix
	}
	return convertThaiGroup(number)
}

func convertThaiGroup(group string) string {
	thaiDigits := []string{"ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"}
	thaiPlaces := []string{"", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"}

	digits := []rune(group)
	length := len(digits)
	var builder strings.Builder
	hasNonZeroBefore := false

	for i, digit := range digits {
		value := int(digit - '0')
		position := length - i
		if value == 0 {
			continue
		}

		word := thaiDigits[value]
		switch position {
		case 1:
			if value == 1 && hasNonZeroBefore {
				word = "เอ็ด"
			}
		case 2:
			if value == 1 {
				word = ""
			} else if value == 2 {
				word = "ยี่"
			}
		}

		builder.WriteString(word)
		if position-1 < len(thaiPlaces) {
			builder.WriteString(thaiPlaces[position-1])
		}
		hasNonZeroBefore = true
	}

	return builder.String()
}
