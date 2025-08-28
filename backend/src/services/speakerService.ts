import { prisma } from '../utils/prisma';

export class SpeakerService {
  /**
   * 話者名から話者マスターを検索する
   * @param speakerName 話者名
   * @param sessionId セッションID（オプション）
   * @returns 見つかった話者情報、または null
   */
  async findSpeakerByName(speakerName: string, sessionId?: string): Promise<any> {
    try {
      // セッション固有の話者を優先的に検索
      if (sessionId) {
        const sessionSpeakers = await prisma.sessionSpeaker.findMany({
          where: { sessionId },
          include: { speaker: true }
        });
        
        // セッションに登録されている話者から検索
        for (const sessionSpeaker of sessionSpeakers) {
          const speaker = sessionSpeaker.speaker;
          
          // 正式名称で一致
          if (speaker.fullName === speakerName) {
            return speaker;
          }
          
          // 表示名で一致
          if (speaker.displayName === speakerName) {
            return speaker;
          }
          
          // エイリアスで一致
          if (speaker.aliases) {
            const aliasesList = speaker.aliases.split(',').map(alias => alias.trim());
            if (aliasesList.includes(speakerName)) {
              return speaker;
            }
          }
        }
      }
      
      // 全体の話者マスターから検索
      const speaker = await prisma.speaker.findFirst({
        where: {
          OR: [
            { fullName: speakerName },
            { displayName: speakerName },
            { aliases: { contains: speakerName } }
          ]
        }
      });
      
      return speaker;
    } catch (error) {
      console.error('Error finding speaker by name:', error);
      return null;
    }
  }
  
  /**
   * 話者名を標準化する
   * @param speakerName 元の話者名
   * @param sessionId セッションID（オプション）
   * @returns 標準化された話者名
   */
  async standardizeSpeakerName(speakerName: string, sessionId?: string): Promise<string> {
    try {
      // 「話者1」などの形式はそのまま返す
      if (/^話者\d+$/.test(speakerName)) {
        return speakerName;
      }
      
      // 話者マスターから検索
      const speaker = await this.findSpeakerByName(speakerName, sessionId);
      
      if (speaker) {
        // 話者タイプに応じた表示名を返す
        switch (speaker.speakerType) {
          case 'MEMBER': // 議員
            return speaker.displayName.endsWith('議員') 
              ? speaker.displayName 
              : `${speaker.displayName}議員`;
          default:
            return speaker.displayName;
        }
      }
      
      // 見つからなければ元の名前を返す
      return speakerName;
    } catch (error) {
      console.error('Error standardizing speaker name:', error);
      return speakerName;
    }
  }
  
  /**
   * Word出力用に話者名をフォーマットする
   * @param speakerName 元の話者名
   * @param sessionId セッションID（オプション）
   * @returns フォーマットされた話者名
   */
  async formatSpeakerForWord(speakerName: string, sessionId?: string): Promise<string> {
    try {
      // 「話者1」などの形式はそのまま返す
      if (/^話者\d+$/.test(speakerName)) {
        return speakerName;
      }
      
      // 話者マスターから検索
      const speaker = await this.findSpeakerByName(speakerName, sessionId);
      
      if (speaker) {
        // 話者タイプに応じたフォーマット
        switch (speaker.speakerType) {
          case 'MEMBER': // 議員
            return `${speaker.fullName}議員`;
          case 'STAFF': // 職員
            return speaker.displayName; // 役職名のみ
          default:
            return speaker.displayName;
        }
      }
      
      // 見つからなければ元の名前を返す
      return speakerName;
    } catch (error) {
      console.error('Error formatting speaker name for Word:', error);
      return speakerName;
    }
  }
  
  /**
   * 話者名を4文字の均等割り付けに整形する
   * @param speakerName 元の話者名
   * @param sessionId セッションID（オプション）
   * @returns 4文字の均等割り付けに整形された話者名
   */
  async formatSpeakerNameFixed(speakerName: string, sessionId?: string): Promise<string> {
    try {
      // まずWord出力用にフォーマット
      const formattedName = await this.formatSpeakerForWord(speakerName, sessionId);
      
      // 文字数を取得
      const nameLength = [...formattedName].length; // サロゲートペア対応
      
      if (nameLength === 4) {
        // 既に4文字なら何もしない
        return formattedName;
      } else if (nameLength < 4) {
        // 4文字未満なら空白で埋める
        return formattedName.padEnd(4 + (formattedName.length - nameLength), '　');
      } else {
        // 4文字より多い場合は切り詰める（ただし「議員」は維持）
        if (formattedName.endsWith('議員')) {
          // 「議員」を除いた部分を調整
          const baseName = formattedName.slice(0, -2);
          const baseNameLength = [...baseName].length;
          if (baseNameLength <= 2) {
            // 「議員」を含めても4文字以下なら何もしない
            return formattedName;
          } else {
            // 「議員」を含めて4文字になるように調整
            return [...baseName].slice(0, 2).join('') + '議員';
          }
        } else {
          // 「議員」がない場合は単純に4文字に切り詰める
          return [...formattedName].slice(0, 4).join('');
        }
      }
    } catch (error) {
      console.error('Error formatting speaker name to fixed width:', error);
      return speakerName;
    }
  }
}

