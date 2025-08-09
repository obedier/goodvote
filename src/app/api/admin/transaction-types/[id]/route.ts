import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeQuery(
      `SELECT * FROM cfg_israel_transaction_type WHERE transaction_type_id = $1`,
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error fetching transaction type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction type' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_active, transaction_type_code, transaction_type_name, description, is_pro_israel } = body;

    let query = 'UPDATE cfg_israel_transaction_type SET updated_at = CURRENT_TIMESTAMP';
    const values: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += `, is_active = $${paramCount}`;
      values.push(is_active);
      paramCount++;
    }

    if (transaction_type_code !== undefined) {
      query += `, transaction_type_code = $${paramCount}`;
      values.push(transaction_type_code);
      paramCount++;
    }

    if (transaction_type_name !== undefined) {
      query += `, transaction_type_name = $${paramCount}`;
      values.push(transaction_type_name);
      paramCount++;
    }

    if (description !== undefined) {
      query += `, description = $${paramCount}`;
      values.push(description);
      paramCount++;
    }

    if (is_pro_israel !== undefined) {
      query += `, is_pro_israel = $${paramCount}`;
      values.push(is_pro_israel);
      paramCount++;
    }

    query += ` WHERE transaction_type_id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await executeQuery(query, values, true);

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error updating transaction type:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction type' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeQuery(
      'DELETE FROM cfg_israel_transaction_type WHERE transaction_type_id = $1 RETURNING *',
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Transaction type deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction type:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction type' },
      { status: 500 }
    );
  }
}
