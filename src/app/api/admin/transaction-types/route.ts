import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT 
        transaction_type_id,
        transaction_type_code,
        transaction_type_name,
        description,
        is_pro_israel,
        is_active,
        created_at,
        updated_at
      FROM cfg_israel_transaction_type 
      ORDER BY transaction_type_code`,
      [],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction types', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Error fetching transaction types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_type_code, transaction_type_name, description, is_pro_israel } = body;

    // Validate required fields
    if (!transaction_type_code || !transaction_type_name) {
      return NextResponse.json(
        { error: 'Transaction type code and name are required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO cfg_israel_transaction_type 
       (transaction_type_code, transaction_type_name, description, is_pro_israel) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [transaction_type_code, transaction_type_name, description || null, is_pro_israel || false],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create transaction type', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data?.[0], { status: 201 });
  } catch (error) {
    console.error('Error creating transaction type:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction type' },
      { status: 500 }
    );
  }
}
