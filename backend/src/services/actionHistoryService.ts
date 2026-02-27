import { PrismaClient, ActionType } from '@prisma/client';

const prisma = new PrismaClient();

// 操作履歴の最大保持数
const MAX_HISTORY_COUNT = 50;

/**
 * 操作履歴を記録する
 * 新しい操作が行われた場合、Undo済み（isUndone=true）のレコードをすべて削除する（Redoスタッククリア）
 */
export const recordAction = async (
  sessionId: string,
  actionType: ActionType,
  targetId: string,
  beforeState: any | null,
  afterState: any | null
) => {
  try {
    // 新しい操作が行われたので、Undo済みのレコード（Redoスタック）をクリア
    await prisma.actionHistory.deleteMany({
      where: {
        sessionId,
        isUndone: true
      }
    });

    // 履歴を記録
    const history = await prisma.actionHistory.create({
      data: {
        sessionId,
        actionType,
        targetId,
        beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
        afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
        isUndone: false,
      }
    });

    // 古い履歴を削除（最新50件のみ保持、isUndone=falseのもの）
    const allHistories = await prisma.actionHistory.findMany({
      where: { sessionId, isUndone: false },
      orderBy: { createdAt: 'desc' }
    });

    if (allHistories.length > MAX_HISTORY_COUNT) {
      const toDelete = allHistories.slice(MAX_HISTORY_COUNT);
      await prisma.actionHistory.deleteMany({
        where: {
          id: {
            in: toDelete.map(h => h.id)
          }
        }
      });
    }

    return history;
  } catch (error) {
    console.error('Error recording action history:', error);
    throw error;
  }
};

/**
 * 最後のUndo可能な操作を取得（isUndone=falseの最新）
 */
export const getLastAction = async (sessionId: string) => {
  try {
    const lastAction = await prisma.actionHistory.findFirst({
      where: { sessionId, isUndone: false },
      orderBy: { createdAt: 'desc' }
    });

    return lastAction;
  } catch (error) {
    console.error('Error getting last action:', error);
    throw error;
  }
};

/**
 * 最後のRedo可能な操作を取得（isUndone=trueの最古）
 */
export const getLastUndoneAction = async (sessionId: string) => {
  try {
    const lastUndone = await prisma.actionHistory.findFirst({
      where: { sessionId, isUndone: true },
      orderBy: { createdAt: 'asc' }
    });

    return lastUndone;
  } catch (error) {
    console.error('Error getting last undone action:', error);
    throw error;
  }
};

/**
 * Undo可能かチェック
 */
export const canUndo = async (sessionId: string): Promise<boolean> => {
  try {
    const lastAction = await getLastAction(sessionId);
    return lastAction !== null;
  } catch (error) {
    console.error('Error checking can undo:', error);
    return false;
  }
};

/**
 * Redo可能かチェック
 */
export const canRedo = async (sessionId: string): Promise<boolean> => {
  try {
    const lastUndone = await getLastUndoneAction(sessionId);
    return lastUndone !== null;
  } catch (error) {
    console.error('Error checking can redo:', error);
    return false;
  }
};

/**
 * Undo実行
 */
export const executeUndo = async (sessionId: string) => {
  try {
    const lastAction = await getLastAction(sessionId);

    if (!lastAction) {
      throw new Error('Undo可能な操作がありません');
    }

    console.log('Executing undo for action:', lastAction.actionType, lastAction.targetId);

    // 操作タイプに応じてUndo処理を実行
    switch (lastAction.actionType) {
      case 'HIGHLIGHT_ADD':
        await undoHighlightAdd(lastAction.targetId);
        break;

      case 'HIGHLIGHT_DELETE':
        await undoHighlightDelete(lastAction.targetId, lastAction.beforeState);
        break;

      case 'HIGHLIGHT_UPDATE':
        await undoHighlightUpdate(lastAction.targetId, lastAction.beforeState);
        break;

      case 'MAPPING_CREATE':
        await undoMappingCreate(lastAction.targetId);
        break;

      case 'MAPPING_UPDATE':
        await undoMappingUpdate(lastAction.targetId, lastAction.beforeState);
        break;

      case 'MAPPING_DELETE':
        await undoMappingDelete(lastAction.targetId, lastAction.beforeState);
        break;

      case 'SECTION_EXCLUDE':
        await undoSectionExclude(lastAction.targetId);
        break;

      case 'SECTION_INCLUDE':
        await undoSectionInclude(lastAction.targetId);
        break;

      case 'SECTION_EDIT':
        await undoSectionEdit(lastAction.targetId, lastAction.beforeState);
        break;

      case 'SECTION_INSERT':
        await undoSectionInsert(lastAction.targetId);
        break;

      case 'SECTION_DELETE':
        await undoSectionDelete(lastAction.targetId, lastAction.beforeState);
        break;

      default:
        throw new Error(`Unknown action type: ${lastAction.actionType}`);
    }

    // 履歴を削除ではなく、isUndone=trueに更新（Redo用に保持）
    await prisma.actionHistory.update({
      where: { id: lastAction.id },
      data: { isUndone: true }
    });

    return {
      success: true,
      actionType: lastAction.actionType,
      message: getUndoMessage(lastAction.actionType)
    };
  } catch (error) {
    console.error('Error executing undo:', error);
    throw error;
  }
};

/**
 * Redo実行
 */
export const executeRedo = async (sessionId: string) => {
  try {
    const lastUndone = await getLastUndoneAction(sessionId);

    if (!lastUndone) {
      throw new Error('Redo可能な操作がありません');
    }

    console.log('Executing redo for action:', lastUndone.actionType, lastUndone.targetId);

    // 操作タイプに応じてRedo処理を実行（afterStateを使って再適用）
    switch (lastUndone.actionType) {
      case 'HIGHLIGHT_ADD':
        await redoHighlightAdd(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'HIGHLIGHT_DELETE':
        await redoHighlightDelete(lastUndone.targetId);
        break;

      case 'HIGHLIGHT_UPDATE':
        await redoHighlightUpdate(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'MAPPING_CREATE':
        await redoMappingCreate(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'MAPPING_UPDATE':
        await redoMappingUpdate(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'MAPPING_DELETE':
        await redoMappingDelete(lastUndone.targetId);
        break;

      case 'SECTION_EXCLUDE':
        await redoSectionExclude(lastUndone.targetId);
        break;

      case 'SECTION_INCLUDE':
        await redoSectionInclude(lastUndone.targetId);
        break;

      case 'SECTION_EDIT':
        await redoSectionEdit(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'SECTION_INSERT':
        await redoSectionInsert(lastUndone.targetId, lastUndone.afterState);
        break;

      case 'SECTION_DELETE':
        await redoSectionDelete(lastUndone.targetId);
        break;

      default:
        throw new Error(`Unknown action type: ${lastUndone.actionType}`);
    }

    // isUndone=falseに戻す（Undoスタックに復帰）
    await prisma.actionHistory.update({
      where: { id: lastUndone.id },
      data: { isUndone: false }
    });

    return {
      success: true,
      actionType: lastUndone.actionType,
      message: getRedoMessage(lastUndone.actionType)
    };
  } catch (error) {
    console.error('Error executing redo:', error);
    throw error;
  }
};

// ===== Undo処理 =====

/**
 * ハイライト追加のUndo（削除）
 */
const undoHighlightAdd = async (highlightId: string) => {
  await prisma.highlight.delete({
    where: { id: highlightId }
  });
};

/**
 * ハイライト削除のUndo（復元）
 */
const undoHighlightDelete = async (highlightId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for highlight delete undo');
  }

  await prisma.highlight.create({
    data: {
      id: highlightId,
      sectionId: beforeState.sectionId,
      startOffset: beforeState.startOffset,
      endOffset: beforeState.endOffset,
      color: beforeState.color,
      text: beforeState.text,
    }
  });
};

/**
 * ハイライト更新のUndo（元の状態に戻す）
 */
const undoHighlightUpdate = async (highlightId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for highlight update undo');
  }

  await prisma.highlight.update({
    where: { id: highlightId },
    data: {
      startOffset: beforeState.startOffset,
      endOffset: beforeState.endOffset,
      color: beforeState.color,
      text: beforeState.text,
    }
  });
};

/**
 * マッピング作成のUndo（削除）
 */
const undoMappingCreate = async (mappingId: string) => {
  await prisma.sectionMapping.delete({
    where: { id: mappingId }
  });
};

/**
 * マッピング更新のUndo（元の状態に戻す）
 */
const undoMappingUpdate = async (mappingId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for mapping update undo');
  }

  await prisma.sectionMapping.update({
    where: { id: mappingId },
    data: {
      nottaSectionId: beforeState.nottaSectionId,
      manusSectionId: beforeState.manusSectionId,
      confidence: beforeState.confidence,
      isManuallyMapped: beforeState.isManuallyMapped,
    }
  });
};

/**
 * マッピング削除のUndo（復元）
 */
const undoMappingDelete = async (mappingId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for mapping delete undo');
  }

  await prisma.sectionMapping.create({
    data: {
      id: mappingId,
      sessionId: beforeState.sessionId,
      nottaSectionId: beforeState.nottaSectionId,
      manusSectionId: beforeState.manusSectionId,
      confidence: beforeState.confidence,
      isManuallyMapped: beforeState.isManuallyMapped,
    }
  });
};

/**
 * セクション除外のUndo（除外解除）
 */
const undoSectionExclude = async (sectionId: string) => {
  await prisma.section.update({
    where: { id: sectionId },
    data: { isExcluded: false }
  });
};

/**
 * セクション除外解除のUndo（除外）
 */
const undoSectionInclude = async (sectionId: string) => {
  await prisma.section.update({
    where: { id: sectionId },
    data: { isExcluded: true }
  });
};

/**
 * セクションテキスト編集のUndo（beforeStateに戻す）
 */
const undoSectionEdit = async (sectionId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for section edit undo');
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: {
      speaker: beforeState.speaker,
      timestamp: beforeState.timestamp,
      endTimestamp: beforeState.endTimestamp,
      content: beforeState.content,
    }
  });
};

/**
 * セクション挿入のUndo（削除）
 */
const undoSectionInsert = async (sectionId: string) => {
  // 挿入されたセクションを取得
  const section = await prisma.section.findUnique({
    where: { id: sectionId }
  });

  if (!section) {
    throw new Error('Section not found for insert undo');
  }

  // セクションを削除
  await prisma.section.delete({
    where: { id: sectionId }
  });

  // 残りのセクションの番号を再整理
  const remainingSections = await prisma.section.findMany({
    where: { transcriptionDataId: section.transcriptionDataId },
    orderBy: { sectionNumber: 'asc' }
  });

  if (remainingSections.length > 0) {
    await prisma.$transaction(
      remainingSections.map((s, index) =>
        prisma.section.update({
          where: { id: s.id },
          data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
        })
      )
    );
  }
};

/**
 * セクション削除のUndo（復元）
 */
const undoSectionDelete = async (sectionId: string, beforeState: any) => {
  if (!beforeState) {
    throw new Error('Before state is missing for section delete undo');
  }

  // セクションを復元
  await prisma.section.create({
    data: {
      id: sectionId,
      transcriptionDataId: beforeState.transcriptionDataId,
      sectionNumber: beforeState.sectionNumber,
      speaker: beforeState.speaker,
      speakerId: beforeState.speakerId || null,
      timestamp: beforeState.timestamp,
      endTimestamp: beforeState.endTimestamp || null,
      content: beforeState.content,
      order: beforeState.order,
      isExcluded: beforeState.isExcluded || false,
    }
  });

  // セクション番号を再整理
  const allSections = await prisma.section.findMany({
    where: { transcriptionDataId: beforeState.transcriptionDataId },
    orderBy: { order: 'asc' }
  });

  await prisma.$transaction(
    allSections.map((s, index) =>
      prisma.section.update({
        where: { id: s.id },
        data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
      })
    )
  );
};

// ===== Redo処理 =====

/**
 * ハイライト追加のRedo（再追加）
 */
const redoHighlightAdd = async (highlightId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for highlight add redo');
  }

  await prisma.highlight.create({
    data: {
      id: highlightId,
      sectionId: afterState.sectionId,
      startOffset: afterState.startOffset,
      endOffset: afterState.endOffset,
      color: afterState.color,
      text: afterState.text,
    }
  });
};

/**
 * ハイライト削除のRedo（再削除）
 */
const redoHighlightDelete = async (highlightId: string) => {
  await prisma.highlight.delete({
    where: { id: highlightId }
  });
};

/**
 * ハイライト更新のRedo（afterStateに更新）
 */
const redoHighlightUpdate = async (highlightId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for highlight update redo');
  }

  await prisma.highlight.update({
    where: { id: highlightId },
    data: {
      startOffset: afterState.startOffset,
      endOffset: afterState.endOffset,
      color: afterState.color,
      text: afterState.text,
    }
  });
};

/**
 * マッピング作成のRedo（再作成）
 */
const redoMappingCreate = async (mappingId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for mapping create redo');
  }

  await prisma.sectionMapping.create({
    data: {
      id: mappingId,
      sessionId: afterState.sessionId,
      nottaSectionId: afterState.nottaSectionId,
      manusSectionId: afterState.manusSectionId,
      confidence: afterState.confidence,
      isManuallyMapped: afterState.isManuallyMapped,
    }
  });
};

/**
 * マッピング更新のRedo（afterStateに更新）
 */
const redoMappingUpdate = async (mappingId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for mapping update redo');
  }

  await prisma.sectionMapping.update({
    where: { id: mappingId },
    data: {
      nottaSectionId: afterState.nottaSectionId,
      manusSectionId: afterState.manusSectionId,
      confidence: afterState.confidence,
      isManuallyMapped: afterState.isManuallyMapped,
    }
  });
};

/**
 * マッピング削除のRedo（再削除）
 */
const redoMappingDelete = async (mappingId: string) => {
  await prisma.sectionMapping.delete({
    where: { id: mappingId }
  });
};

/**
 * セクション除外のRedo（再除外）
 */
const redoSectionExclude = async (sectionId: string) => {
  await prisma.section.update({
    where: { id: sectionId },
    data: { isExcluded: true }
  });
};

/**
 * セクション除外解除のRedo（再除外解除）
 */
const redoSectionInclude = async (sectionId: string) => {
  await prisma.section.update({
    where: { id: sectionId },
    data: { isExcluded: false }
  });
};

/**
 * セクションテキスト編集のRedo（afterStateに更新）
 */
const redoSectionEdit = async (sectionId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for section edit redo');
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: {
      speaker: afterState.speaker,
      timestamp: afterState.timestamp,
      endTimestamp: afterState.endTimestamp,
      content: afterState.content,
    }
  });
};

/**
 * セクション挿入のRedo（再挿入）
 */
const redoSectionInsert = async (sectionId: string, afterState: any) => {
  if (!afterState) {
    throw new Error('After state is missing for section insert redo');
  }

  // セクションを再作成
  await prisma.section.create({
    data: {
      id: sectionId,
      transcriptionDataId: afterState.transcriptionDataId,
      sectionNumber: afterState.sectionNumber,
      speaker: afterState.speaker,
      speakerId: afterState.speakerId || null,
      timestamp: afterState.timestamp,
      endTimestamp: afterState.endTimestamp || null,
      content: afterState.content,
      order: afterState.order,
      isExcluded: afterState.isExcluded || false,
    }
  });

  // セクション番号を再整理
  const allSections = await prisma.section.findMany({
    where: { transcriptionDataId: afterState.transcriptionDataId },
    orderBy: { order: 'asc' }
  });

  await prisma.$transaction(
    allSections.map((s, index) =>
      prisma.section.update({
        where: { id: s.id },
        data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
      })
    )
  );
};

/**
 * セクション削除のRedo（再削除）
 */
const redoSectionDelete = async (sectionId: string) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId }
  });

  if (!section) {
    throw new Error('Section not found for delete redo');
  }

  await prisma.section.delete({
    where: { id: sectionId }
  });

  // 残りのセクション番号を再整理
  const remainingSections = await prisma.section.findMany({
    where: { transcriptionDataId: section.transcriptionDataId },
    orderBy: { sectionNumber: 'asc' }
  });

  if (remainingSections.length > 0) {
    await prisma.$transaction(
      remainingSections.map((s, index) =>
        prisma.section.update({
          where: { id: s.id },
          data: { sectionNumber: (index + 1).toString().padStart(4, '0') }
        })
      )
    );
  }
};

// ===== メッセージ =====

/**
 * Undoメッセージを取得
 */
const getUndoMessage = (actionType: ActionType): string => {
  const messages: Record<ActionType, string> = {
    HIGHLIGHT_ADD: 'ハイライトの追加を取り消しました',
    HIGHLIGHT_DELETE: 'ハイライトの削除を取り消しました',
    HIGHLIGHT_UPDATE: 'ハイライトの更新を取り消しました',
    MAPPING_CREATE: 'マッピングの作成を取り消しました',
    MAPPING_UPDATE: 'マッピングの更新を取り消しました',
    MAPPING_DELETE: 'マッピングの削除を取り消しました',
    SECTION_EXCLUDE: 'セクションの除外を取り消しました',
    SECTION_INCLUDE: 'セクションの除外解除を取り消しました',
    SECTION_EDIT: 'テキスト編集を取り消しました',
    SECTION_INSERT: 'セクション挿入を取り消しました',
    SECTION_DELETE: 'セクション削除を取り消しました',
  };

  return messages[actionType] || '操作を取り消しました';
};

/**
 * Redoメッセージを取得
 */
const getRedoMessage = (actionType: ActionType): string => {
  const messages: Record<ActionType, string> = {
    HIGHLIGHT_ADD: 'ハイライトの追加をやり直しました',
    HIGHLIGHT_DELETE: 'ハイライトの削除をやり直しました',
    HIGHLIGHT_UPDATE: 'ハイライトの更新をやり直しました',
    MAPPING_CREATE: 'マッピングの作成をやり直しました',
    MAPPING_UPDATE: 'マッピングの更新をやり直しました',
    MAPPING_DELETE: 'マッピングの削除をやり直しました',
    SECTION_EXCLUDE: 'セクションの除外をやり直しました',
    SECTION_INCLUDE: 'セクションの除外解除をやり直しました',
    SECTION_EDIT: 'テキスト編集をやり直しました',
    SECTION_INSERT: 'セクション挿入をやり直しました',
    SECTION_DELETE: 'セクション削除をやり直しました',
  };

  return messages[actionType] || '操作をやり直しました';
};

/**
 * セッションの操作履歴を取得
 */
export const getActionHistory = async (sessionId: string, limit: number = 20) => {
  try {
    const histories = await prisma.actionHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return histories;
  } catch (error) {
    console.error('Error getting action history:', error);
    throw error;
  }
};
