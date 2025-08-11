import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// สร้าง connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '147.50.230.213',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_DATABASE || 'fund_cpkku',
  user: process.env.DB_USERNAME || 'devuser',
  password: process.env.DB_PASSWORD || 'devpw',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET /api/years
export async function GET() {
  try {
    const [years] = await pool.execute(`
      SELECT 
        year_id, 
        year, 
        budget,
        status
      FROM years
      WHERE status = 'active' 
        AND (delete_at IS NULL OR delete_at = '')
      ORDER BY year DESC
    `);

    // Validate and clean the data
    const validYears = years.filter(y => y.year_id && y.year).map(y => ({
      year_id: parseInt(y.year_id),
      year: y.year.toString(),
      budget: parseFloat(y.budget) || 0,
      status: y.status || 'active'
    }));

    // Return structure that matches frontend expectations
    return NextResponse.json({
      success: true,
      data: validYears,
      years: validYears, // For compatibility with existing code
      message: `Found ${validYears.length} active years`
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch years: ' + error.message },
      { status: 500 }
    );
  }
}