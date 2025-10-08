package controllers

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"fund-management-api/config"
	"fund-management-api/models"
)

const testDriverName = "fundcopy"

var (
	driverOnce  sync.Once
	globalStore *fundCopyStore
)

type fundCopyStore struct {
	mu             sync.Mutex
	years          []yearRow
	categories     []categoryRow
	subcategories  []subcategoryRow
	budgets        []budgetRow
	nextYearID     int
	nextCategoryID int
	nextSubcatID   int
	nextBudgetID   int
}

type yearRow struct {
	ID      int
	Year    string
	Budget  float64
	Status  string
	Create  time.Time
	Update  time.Time
	Deleted *time.Time
}

type categoryRow struct {
	ID       int
	YearID   int
	Name     string
	Status   string
	CreateAt time.Time
	UpdateAt time.Time
	Deleted  *time.Time
}

type subcategoryRow struct {
	ID         int
	CategoryID int
	Name       string
	Condition  *string
	Target     *string
	FormType   string
	FormURL    string
	Status     string
	Comment    *string
	CreateAt   time.Time
	UpdateAt   time.Time
	Deleted    *time.Time
}

type budgetRow struct {
	ID                int
	SubcategoryID     int
	RecordScope       string
	AllocatedAmount   float64
	UsedAmount        float64
	RemainingBudget   float64
	MaxAmountPerYear  *float64
	MaxGrants         *int
	MaxAmountPerGrant *float64
	RemainingGrant    *int
	Level             *string
	Status            string
	FundDescription   *string
	Comment           *string
	CreateAt          time.Time
	UpdateAt          time.Time
	Deleted           *time.Time
}

func newFundCopyStore() *fundCopyStore {
	return &fundCopyStore{
		nextYearID:     1,
		nextCategoryID: 1,
		nextSubcatID:   1,
		nextBudgetID:   1,
	}
}

func (s *fundCopyStore) reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.years = nil
	s.categories = nil
	s.subcategories = nil
	s.budgets = nil
	s.nextYearID = 1
	s.nextCategoryID = 1
	s.nextSubcatID = 1
	s.nextBudgetID = 1
}

func (s *fundCopyStore) cloneState() fundCopyState {
	s.mu.Lock()
	defer s.mu.Unlock()
	return fundCopyState{
		years:          append([]yearRow(nil), s.years...),
		categories:     append([]categoryRow(nil), s.categories...),
		subcategories:  append([]subcategoryRow(nil), s.subcategories...),
		budgets:        append([]budgetRow(nil), s.budgets...),
		nextYearID:     s.nextYearID,
		nextCategoryID: s.nextCategoryID,
		nextSubcatID:   s.nextSubcatID,
		nextBudgetID:   s.nextBudgetID,
	}
}

func (s *fundCopyStore) applyState(state fundCopyState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.years = append([]yearRow(nil), state.years...)
	s.categories = append([]categoryRow(nil), state.categories...)
	s.subcategories = append([]subcategoryRow(nil), state.subcategories...)
	s.budgets = append([]budgetRow(nil), state.budgets...)
	s.nextYearID = state.nextYearID
	s.nextCategoryID = state.nextCategoryID
	s.nextSubcatID = state.nextSubcatID
	s.nextBudgetID = state.nextBudgetID
}

type fundCopyState struct {
	years          []yearRow
	categories     []categoryRow
	subcategories  []subcategoryRow
	budgets        []budgetRow
	nextYearID     int
	nextCategoryID int
	nextSubcatID   int
	nextBudgetID   int
}

type fundCopyConn struct {
	store *fundCopyStore
	tx    *fundCopyState
}

type fundCopyDriver struct{}

type fundCopyTx struct {
	conn *fundCopyConn
	done bool
}

type fundCopyResult struct {
	lastID int64
	rows   int64
}

type fundCopyRows struct {
	columns []string
	data    [][]driver.Value
	idx     int
}

func registerFundCopyDriver() {
	driverOnce.Do(func() {
		globalStore = newFundCopyStore()
		sql.Register(testDriverName, &fundCopyDriver{})
	})
}

func (d *fundCopyDriver) Open(name string) (driver.Conn, error) {
	return &fundCopyConn{store: globalStore}, nil
}

func (c *fundCopyConn) ensureState() *fundCopyState {
	if c.tx == nil {
		snapshot := c.store.cloneState()
		c.tx = &snapshot
	}
	return c.tx
}

func (c *fundCopyConn) Begin() (driver.Tx, error) {
	return c.BeginTx(context.Background(), driver.TxOptions{})
}

func (c *fundCopyConn) BeginTx(ctx context.Context, opts driver.TxOptions) (driver.Tx, error) {
	c.ensureState()
	return &fundCopyTx{conn: c}, nil
}

func (tx *fundCopyTx) Commit() error {
	if tx.done {
		return errors.New("transaction already finished")
	}
	tx.conn.store.applyState(*tx.conn.tx)
	tx.conn.tx = nil
	tx.done = true
	return nil
}

func (tx *fundCopyTx) Rollback() error {
	if tx.done {
		return errors.New("transaction already finished")
	}
	tx.conn.tx = nil
	tx.done = true
	return nil
}

func (c *fundCopyConn) Close() error { return nil }

func (c *fundCopyConn) Prepare(query string) (driver.Stmt, error) {
	return nil, errors.New("prepare not supported")
}

func (c *fundCopyConn) PrepareContext(ctx context.Context, query string) (driver.Stmt, error) {
	return nil, errors.New("prepare not supported")
}

func (c *fundCopyConn) Exec(query string, args []driver.Value) (driver.Result, error) {
	named := make([]driver.NamedValue, len(args))
	for i, v := range args {
		named[i] = driver.NamedValue{Ordinal: i + 1, Value: v}
	}
	return c.ExecContext(context.Background(), query, named)
}

func (c *fundCopyConn) ExecContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	fmt.Println("EXEC:", query)
	state := c.ensureState()
	switch {
	case strings.HasPrefix(query, "CREATE TABLE"):
		return fundCopyResult{rows: 0}, nil
	case strings.HasPrefix(query, "INSERT INTO `years`"):
		id := state.nextYearID
		state.nextYearID++
		state.years = append(state.years, yearRow{
			ID:     id,
			Year:   fmt.Sprint(args[0].Value),
			Budget: toFloat64(args[1].Value),
			Status: fmt.Sprint(args[2].Value),
			Create: toTime(args[3].Value),
			Update: toTime(args[4].Value),
		})
		return fundCopyResult{lastID: int64(id), rows: 1}, nil
	case strings.HasPrefix(query, "INSERT INTO `fund_categories`"):
		id := state.nextCategoryID
		state.nextCategoryID++
		state.categories = append(state.categories, categoryRow{
			ID:       id,
			Name:     fmt.Sprint(args[0].Value),
			Status:   fmt.Sprint(args[1].Value),
			YearID:   int(toInt64(args[2].Value)),
			CreateAt: toTime(args[3].Value),
			UpdateAt: toTime(args[4].Value),
		})
		return fundCopyResult{lastID: int64(id), rows: 1}, nil
	case strings.HasPrefix(query, "INSERT INTO `fund_subcategories`"):
		id := state.nextSubcatID
		state.nextSubcatID++
		state.subcategories = append(state.subcategories, subcategoryRow{
			ID:         id,
			CategoryID: int(toInt64(args[0].Value)),
			Name:       fmt.Sprint(args[1].Value),
			Condition:  toNullableString(args[2].Value),
			Target:     toNullableString(args[3].Value),
			FormType:   fmt.Sprint(args[4].Value),
			FormURL:    fmt.Sprint(args[5].Value),
			Status:     fmt.Sprint(args[6].Value),
			Comment:    toNullableString(args[7].Value),
			CreateAt:   toTime(args[8].Value),
			UpdateAt:   toTime(args[9].Value),
		})
		return fundCopyResult{lastID: int64(id), rows: 1}, nil
	case strings.HasPrefix(query, "INSERT INTO subcategory_budgets"):
		id := state.nextBudgetID
		state.nextBudgetID++
		state.budgets = append(state.budgets, budgetRow{
			ID:                id,
			SubcategoryID:     int(toInt64(args[0].Value)),
			RecordScope:       strings.ToLower(fmt.Sprint(args[1].Value)),
			AllocatedAmount:   toFloat64(args[2].Value),
			UsedAmount:        0,
			RemainingBudget:   toFloat64(args[3].Value),
			MaxAmountPerYear:  toNullableFloat(args[4].Value),
			MaxGrants:         toNullableInt(args[5].Value),
			MaxAmountPerGrant: toNullableFloat(args[6].Value),
			RemainingGrant:    toNullableInt(args[7].Value),
			Level:             toNullableString(args[8].Value),
			Status:            fmt.Sprint(args[9].Value),
			FundDescription:   toNullableString(args[10].Value),
			Comment:           toNullableString(args[11].Value),
			CreateAt:          toTime(args[12].Value),
			UpdateAt:          toTime(args[13].Value),
		})
		return fundCopyResult{lastID: int64(id), rows: 1}, nil
	default:
		return nil, fmt.Errorf("unsupported exec query: %s", query)
	}
}

func (c fundCopyResult) LastInsertId() (int64, error) { return c.lastID, nil }

func (c fundCopyResult) RowsAffected() (int64, error) { return c.rows, nil }

func (c *fundCopyConn) Query(query string, args []driver.Value) (driver.Rows, error) {
	named := make([]driver.NamedValue, len(args))
	for i, v := range args {
		named[i] = driver.NamedValue{Ordinal: i + 1, Value: v}
	}
	return c.QueryContext(context.Background(), query, named)
}

func (c *fundCopyConn) QueryContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	state := c.ensureState()
	switch {
	case strings.Contains(query, "FROM `years`"):
		if strings.Contains(query, "year_id = ?") {
			id := int(toInt64(args[0].Value))
			for _, y := range state.years {
				if y.ID == id && y.Deleted == nil {
					return newRowsWithColumns([]string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}, yearToValues(y))
				}
			}
			return newRowsWithColumns([]string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}, nil)
		}
		if strings.Contains(query, "year = ?") {
			value := fmt.Sprint(args[0].Value)
			for _, y := range state.years {
				if y.Year == value && y.Deleted == nil {
					return newRowsWithColumns([]string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}, yearToValues(y))
				}
			}
			return newRowsWithColumns([]string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}, nil)
		}
	case strings.Contains(query, "FROM `fund_categories`"):
		if strings.Contains(query, "year_id = ?") {
			yearID := int(toInt64(args[0].Value))
			var data [][]driver.Value
			for _, c := range state.categories {
				if c.YearID == yearID && c.Deleted == nil {
					data = append(data, categoryToValues(c))
				}
			}
			return newRowsWithColumns([]string{"category_id", "category_name", "status", "year_id", "create_at", "update_at", "delete_at"}, data)
		}
	case strings.Contains(query, "FROM `fund_subcategories`"):
		if len(args) == 1 {
			ids := toIntSlice(args[0].Value)
			idset := make(map[int]struct{}, len(ids))
			for _, id := range ids {
				idset[id] = struct{}{}
			}
			var data [][]driver.Value
			for _, sc := range state.subcategories {
				if sc.Deleted == nil {
					if len(idset) == 0 {
						data = append(data, subcategoryToValues(sc))
						continue
					}
					if _, ok := idset[sc.CategoryID]; ok {
						data = append(data, subcategoryToValues(sc))
					}
				}
			}
			return newRowsWithColumns([]string{"subcategory_id", "category_id", "subcategory_name", "fund_condition", "target_roles", "form_type", "form_url", "status", "comment", "create_at", "update_at", "delete_at"}, data)
		}
	case strings.Contains(query, "FROM subcategory_budgets") || strings.Contains(query, "FROM `subcategory_budgets`"):
		if len(args) == 1 {
			ids := toIntSlice(args[0].Value)
			idset := make(map[int]struct{}, len(ids))
			for _, id := range ids {
				idset[id] = struct{}{}
			}
			var data [][]driver.Value
			for _, b := range state.budgets {
				if b.Deleted == nil {
					if _, ok := idset[b.SubcategoryID]; ok {
						data = append(data, budgetToValues(b))
					}
				}
			}
			return newRowsWithColumns([]string{
				"subcategory_id",
				"record_scope",
				"allocated_amount",
				"max_amount_per_year",
				"max_grants",
				"max_amount_per_grant",
				"level",
				"status",
				"fund_description",
				"comment",
			}, data)
		}
	}
	return nil, fmt.Errorf("unsupported query: %s", query)
}

func newRows(data [][]driver.Value) (driver.Rows, error) {
	columns := []string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}
	if len(data) > 0 {
		switch len(data[0]) {
		case 7:
			columns = []string{"year_id", "year", "budget", "status", "create_at", "update_at", "delete_at"}
		case 8:
			columns = []string{"category_id", "category_name", "status", "year_id", "create_at", "update_at", "delete_at", "extra"}
		case 10:
			columns = []string{"subcategory_id", "category_id", "subcategory_name", "fund_condition", "target_roles", "form_type", "form_url", "status", "comment", "create_at"}
		case 11:
			columns = []string{"subcategory_id", "record_scope", "allocated_amount", "max_amount_per_year", "max_grants", "max_amount_per_grant", "level", "status", "fund_description", "comment", "extra"}
		case 12:
			columns = []string{"subcategory_id", "category_id", "subcategory_name", "fund_condition", "target_roles", "form_type", "form_url", "status", "comment", "create_at", "update_at", "delete_at"}
		}
	}
	return newRowsWithColumns(columns, data)
}

func newRowsWithColumns(columns []string, data [][]driver.Value) (driver.Rows, error) {
	return &fundCopyRows{columns: columns, data: data}, nil
}

func (r *fundCopyRows) Columns() []string { return r.columns }

func (r *fundCopyRows) Close() error { return nil }

func (r *fundCopyRows) Next(dest []driver.Value) error {
	if r.idx >= len(r.data) {
		return io.EOF
	}
	copy(dest, r.data[r.idx])
	r.idx++
	return nil
}

func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	default:
		return 0
	}
}

func toInt64(v interface{}) int64 {
	switch val := v.(type) {
	case int:
		return int64(val)
	case int64:
		return val
	case int32:
		return int64(val)
	case float64:
		return int64(val)
	default:
		return 0
	}
}

func toTime(v interface{}) time.Time {
	switch val := v.(type) {
	case time.Time:
		return val
	case *time.Time:
		if val != nil {
			return *val
		}
	}
	return time.Now()
}

func toNullableString(v interface{}) *string {
	if v == nil {
		return nil
	}
	str := fmt.Sprint(v)
	if str == "" {
		return nil
	}
	return &str
}

func toNullableFloat(v interface{}) *float64 {
	switch val := v.(type) {
	case nil:
		return nil
	case float64:
		return &val
	case float32:
		f := float64(val)
		return &f
	case int:
		f := float64(val)
		return &f
	case int64:
		f := float64(val)
		return &f
	}
	return nil
}

func toNullableInt(v interface{}) *int {
	switch val := v.(type) {
	case nil:
		return nil
	case int:
		return &val
	case int64:
		i := int(val)
		return &i
	}
	return nil
}

func toIntSlice(v interface{}) []int {
	switch val := v.(type) {
	case []int:
		return val
	case []interface{}:
		res := make([]int, 0, len(val))
		for _, item := range val {
			res = append(res, int(toInt64(item)))
		}
		return res
	case int:
		return []int{val}
	case int64:
		return []int{int(val)}
	case string:
		parts := strings.Split(val, ",")
		res := make([]int, 0, len(parts))
		for _, p := range parts {
			if p == "" {
				continue
			}
			iv, _ := strconv.Atoi(strings.TrimSpace(p))
			res = append(res, iv)
		}
		return res
	default:
		return nil
	}
}

func yearToValues(y yearRow) [][]driver.Value {
	return [][]driver.Value{{int64(y.ID), y.Year, y.Budget, y.Status, y.Create, y.Update, y.Deleted}}
}

func categoryToValues(c categoryRow) []driver.Value {
	return []driver.Value{int64(c.ID), c.Name, c.Status, int64(c.YearID), c.CreateAt, c.UpdateAt, c.Deleted}
}

func subcategoryToValues(s subcategoryRow) []driver.Value {
	return []driver.Value{int64(s.ID), int64(s.CategoryID), s.Name, s.Condition, s.Target, s.FormType, s.FormURL, s.Status, s.Comment, s.CreateAt, s.UpdateAt, s.Deleted}
}

func budgetToValues(b budgetRow) []driver.Value {
	var maxAmountPerYear interface{}
	if b.MaxAmountPerYear != nil {
		maxAmountPerYear = *b.MaxAmountPerYear
	}
	var maxGrants interface{}
	if b.MaxGrants != nil {
		maxGrants = *b.MaxGrants
	}
	var maxAmountPerGrant interface{}
	if b.MaxAmountPerGrant != nil {
		maxAmountPerGrant = *b.MaxAmountPerGrant
	}
	var level interface{}
	if b.Level != nil {
		level = *b.Level
	}
	var fundDescription interface{}
	if b.FundDescription != nil {
		fundDescription = *b.FundDescription
	}
	var comment interface{}
	if b.Comment != nil {
		comment = *b.Comment
	}
	return []driver.Value{
		int64(b.SubcategoryID),
		b.RecordScope,
		b.AllocatedAmount,
		maxAmountPerYear,
		maxGrants,
		maxAmountPerGrant,
		level,
		b.Status,
		fundDescription,
		comment,
	}
}

func setupCopyTestDB(t *testing.T) *gorm.DB {
	registerFundCopyDriver()
	globalStore.reset()
	sqlDB, err := sql.Open(testDriverName, "test")
	if err != nil {
		t.Fatalf("failed to open test driver: %v", err)
	}
	db, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
		DriverName:                testDriverName,
	}), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm: %v", err)
	}
	config.DB = db
	return db
}

func seedSourceData(now time.Time) (models.Year, models.FundCategory, models.FundSubcategory) {
	year := yearRow{ID: globalStore.nextYearID, Year: "2024", Budget: 1000, Status: "active", Create: now, Update: now}
	globalStore.nextYearID++
	globalStore.years = append(globalStore.years, year)

	category := categoryRow{ID: globalStore.nextCategoryID, YearID: year.ID, Name: "Research", Status: "active", CreateAt: now, UpdateAt: now}
	globalStore.nextCategoryID++
	globalStore.categories = append(globalStore.categories, category)

	subcategory := subcategoryRow{ID: globalStore.nextSubcatID, CategoryID: category.ID, Name: "Innovation", FormType: "fund", Status: "active", CreateAt: now, UpdateAt: now}
	globalStore.nextSubcatID++
	globalStore.subcategories = append(globalStore.subcategories, subcategory)

	globalStore.budgets = append(globalStore.budgets,
		budgetRow{
			ID:              globalStore.nextBudgetID,
			SubcategoryID:   subcategory.ID,
			RecordScope:     "overall",
			AllocatedAmount: 500,
			UsedAmount:      100,
			RemainingBudget: 400,
			MaxAmountPerYear: func() *float64 {
				f := 400.0
				return &f
			}(),
			MaxGrants: func() *int {
				v := 5
				return &v
			}(),
			Status:          "active",
			FundDescription: func() *string { s := "Overall budget"; return &s }(),
			Comment:         func() *string { s := "Keep track"; return &s }(),
			CreateAt:        now,
			UpdateAt:        now,
		},
	)
	globalStore.nextBudgetID++

	globalStore.budgets = append(globalStore.budgets,
		budgetRow{
			ID:                globalStore.nextBudgetID,
			SubcategoryID:     subcategory.ID,
			RecordScope:       "rule",
			AllocatedAmount:   0,
			UsedAmount:        0,
			RemainingBudget:   0,
			MaxAmountPerGrant: func() *float64 { f := 100.0; return &f }(),
			Level:             func() *string { s := "level-1"; return &s }(),
			Status:            "active",
			FundDescription:   func() *string { s := "Rule budget"; return &s }(),
			Comment:           func() *string { s := "Per grant cap"; return &s }(),
			CreateAt:          now,
			UpdateAt:          now,
		},
	)
	globalStore.nextBudgetID++

	return models.Year{YearID: year.ID, Year: year.Year, Budget: year.Budget, Status: year.Status},
		models.FundCategory{CategoryID: category.ID, YearID: category.YearID, CategoryName: category.Name, Status: category.Status},
		models.FundSubcategory{SubcategoryID: subcategory.ID, CategoryID: subcategory.CategoryID, SubcategoryName: subcategory.Name, FormType: subcategory.FormType, Status: subcategory.Status}
}

func createRequest(t *testing.T, payload map[string]interface{}) *http.Request {
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/admin/funds/copy-year", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func TestCopyFundConfigurationToYear_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCopyTestDB(t)
	now := time.Now()
	sourceYear, _, sourceSub := seedSourceData(now)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = createRequest(t, map[string]interface{}{
		"source_year_id": sourceYear.YearID,
		"target_year":    "2025",
		"target_budget":  1500.0,
	})
	ctx.Set("roleID", 3)

	CopyFundConfigurationToYear(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response struct {
		Success bool        `json:"success"`
		Year    models.Year `json:"year"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if !response.Success {
		t.Fatalf("expected success true")
	}
	if response.Year.Year != "2025" {
		t.Fatalf("expected new year 2025, got %s", response.Year.Year)
	}
	if response.Year.Budget != 1500 {
		t.Fatalf("expected budget 1500, got %f", response.Year.Budget)
	}

	state := globalStore.cloneState()
	var newYear *yearRow
	for i := range state.years {
		if state.years[i].Year == "2025" {
			newYear = &state.years[i]
			break
		}
	}
	if newYear == nil {
		t.Fatalf("new year not created")
	}

	var newCategory *categoryRow
	for i := range state.categories {
		if state.categories[i].YearID == newYear.ID {
			newCategory = &state.categories[i]
			break
		}
	}
	if newCategory == nil {
		t.Fatalf("new category missing")
	}

	var newSubcategory *subcategoryRow
	for i := range state.subcategories {
		if state.subcategories[i].CategoryID == newCategory.ID {
			newSubcategory = &state.subcategories[i]
			break
		}
	}
	if newSubcategory == nil {
		t.Fatalf("new subcategory missing")
	}

	var copiedBudgets []budgetRow
	for _, b := range state.budgets {
		if b.SubcategoryID == newSubcategory.ID {
			copiedBudgets = append(copiedBudgets, b)
		}
	}
	if len(copiedBudgets) != 2 {
		t.Fatalf("expected 2 budgets, got %d", len(copiedBudgets))
	}

	for _, b := range copiedBudgets {
		switch b.RecordScope {
		case "overall":
			if b.AllocatedAmount != 500 {
				t.Fatalf("overall allocated mismatch: %f", b.AllocatedAmount)
			}
			if b.UsedAmount != 0 {
				t.Fatalf("overall used amount should reset to 0, got %f", b.UsedAmount)
			}
			if b.RemainingBudget != 500 {
				t.Fatalf("overall remaining budget should match allocation, got %f", b.RemainingBudget)
			}
			if b.MaxAmountPerYear == nil || *b.MaxAmountPerYear != 400 {
				t.Fatalf("overall max per year mismatch")
			}
			if b.MaxGrants == nil || *b.MaxGrants != 5 {
				t.Fatalf("overall max grants mismatch")
			}
		case "rule":
			if b.MaxAmountPerYear != nil {
				t.Fatalf("rule should not carry per-year cap")
			}
			if b.MaxGrants != nil {
				t.Fatalf("rule should not carry max grants")
			}
			if b.MaxAmountPerGrant == nil || *b.MaxAmountPerGrant != 100 {
				t.Fatalf("rule max per grant mismatch")
			}
		default:
			t.Fatalf("unexpected scope %s", b.RecordScope)
		}
	}

	var originalBudgetCount int
	for _, b := range state.budgets {
		if b.SubcategoryID == sourceSub.SubcategoryID {
			originalBudgetCount++
		}
	}
	if originalBudgetCount != 2 {
		t.Fatalf("original budgets should remain, got %d", originalBudgetCount)
	}
}

func TestCopyFundConfigurationToYear_TargetYearExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupCopyTestDB(t)
	now := time.Now()
	sourceYear, _, _ := seedSourceData(now)

	globalStore.years = append(globalStore.years, yearRow{ID: globalStore.nextYearID, Year: "2025", Budget: 2000, Status: "active", Create: now, Update: now})
	globalStore.nextYearID++

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = createRequest(t, map[string]interface{}{
		"source_year_id": sourceYear.YearID,
		"target_year":    "2025",
	})
	ctx.Set("roleID", 3)

	CopyFundConfigurationToYear(ctx)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected conflict, got %d", w.Code)
	}

	var response map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if response["error"] != "Target year already exists" {
		t.Fatalf("unexpected error: %v", response)
	}

	count := 0
	for _, y := range globalStore.years {
		if y.Year == "2025" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected no duplicate target year, found %d", count)
	}
}
