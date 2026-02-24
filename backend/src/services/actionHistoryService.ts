import { PrismaClient, ActionType } from '@prisma/client';

const prisma = new PrismaClient();

// 操作履歴の最大保持数
const MAX_HISTORY_COUNT = 50;

/**
 * 操作履歴を記録する
 */
export const recordAction = async (
  sessionId: string,
  actionType: ActionType,
  targetId: string,
  beforeState: any | null,
  afterState: any | null
) => {
  try {
    // 履歴を記録
    const history = await prisma.actionHistory.create({
      data: {
        sessionId,
        actionType,
        targetId,
        beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
        afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
      }
    });

    // 古い履歴を削除（最新50件のみ保持）
    const allHistories = await prisma.actionHistory.findMany({
      where: { sessionId },
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
 * 最後の操作を取得
 */
export const getLastAction = async (sessionId: string) => {
  try {
    const lastAction = await prisma.actionHistory.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });

    return lastAction;
  } catch (error) {
    console.error('Error getting last action:', error);
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

      default:
        throw new Error(`Unknown action type: ${lastAction.actionType}`);
    }

    // 履歴から削除
    await prisma.actionHistory.delete({
      where: { id: lastAction.id }
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
  };

  return messages[actionType] || '操作を取り消しました';
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
