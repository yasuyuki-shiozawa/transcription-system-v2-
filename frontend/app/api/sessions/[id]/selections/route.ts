import { NextRequest, NextResponse } from 'next/server';
import { SectionSelectionState } from '../../../../../types/SectionSelection';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// セクション選択状態取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${BACKEND_URL}/api/sessions/${id}/selections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // バックエンドが404を返す場合は、空の選択状態を返す
      if (response.status === 404) {
        const emptyState: SectionSelectionState = {
          sessionId: id,
          selections: {},
          metadata: {
            lastUpdated: Date.now(),
            totalSelected: 0,
            selectionMode: 'inclusive'
          }
        };
        
        return NextResponse.json({
          success: true,
          data: emptyState,
          message: 'No existing selections found, returning empty state'
        });
      }
      
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching section selections:', error);
    
    // エラー時も空の状態を返してフロントエンドが動作するようにする
    const { id } = await params;
    const emptyState: SectionSelectionState = {
      sessionId: id,
      selections: {},
      metadata: {
        lastUpdated: Date.now(),
        totalSelected: 0,
        selectionMode: 'inclusive'
      }
    };
    
    return NextResponse.json({
      success: true,
      data: emptyState,
      message: 'Fallback to empty state due to backend error'
    });
  }
}

// セクション選択状態保存
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const selectionState: SectionSelectionState = await request.json();
    
    // バリデーション
    if (!selectionState.sessionId || selectionState.sessionId !== id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session ID in selection state'
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/sessions/${id}/selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(selectionState)
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving section selections:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'セクション選択状態の保存に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// セクション選択状態更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/sessions/${id}/selections`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating section selections:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'セクション選択状態の更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}