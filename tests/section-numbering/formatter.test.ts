import { StatementFormatter } from '../../src/section-numbering/formatter';
import { Statement } from '../../src/types';

describe('StatementFormatter', () => {
  let formatter: StatementFormatter;

  beforeEach(() => {
    formatter = new StatementFormatter();
  });

  const sampleStatements: Statement[] = [
    { speakerNumber: 1, time: '10:30', content: '最初の発言' },
    { speakerNumber: 2, time: '10:35', content: '2番目の発言' },
    { speakerNumber: 1, time: '10:40', content: '3番目の発言' }
  ];

  describe('addSectionNumbers', () => {
    it('デフォルト設定でセクション番号を付与できる', () => {
      const result = formatter.addSectionNumbers(sampleStatements);

      expect(result).toHaveLength(3);
      expect(result[0].sectionNumber).toBe('0001');
      expect(result[1].sectionNumber).toBe('0002');
      expect(result[2].sectionNumber).toBe('0003');
    });

    it('開始番号を指定できる', () => {
      const result = formatter.addSectionNumbers(sampleStatements, { startNumber: 100 });

      expect(result[0].sectionNumber).toBe('0100');
      expect(result[1].sectionNumber).toBe('0101');
      expect(result[2].sectionNumber).toBe('0102');
    });

    it('桁数を指定できる', () => {
      const result = formatter.addSectionNumbers(sampleStatements, { digits: 6 });

      expect(result[0].sectionNumber).toBe('000001');
      expect(result[1].sectionNumber).toBe('000002');
      expect(result[2].sectionNumber).toBe('000003');
    });

    it('元のデータを変更しない', () => {
      const originalStatements = [...sampleStatements];
      formatter.addSectionNumbers(sampleStatements);

      expect(sampleStatements).toEqual(originalStatements);
    });
  });

  describe('formatStatement', () => {
    it('セクション番号付き発言を正しくフォーマットできる', () => {
      const sectionedStatement = {
        speakerNumber: 5,
        time: '14:30',
        content: 'これはテスト発言です。',
        sectionNumber: '0042'
      };

      const result = formatter.formatStatement(sectionedStatement);

      expect(result).toBe(
        '【セクション：0042】[話者5][14:30]\nこれはテスト発言です。'
      );
    });

    it('複数行の発言も正しくフォーマットできる', () => {
      const sectionedStatement = {
        speakerNumber: 1,
        time: '09:00',
        content: '1行目\n2行目\n3行目',
        sectionNumber: '0001'
      };

      const result = formatter.formatStatement(sectionedStatement);

      expect(result).toBe(
        '【セクション：0001】[話者1][09:00]\n1行目\n2行目\n3行目'
      );
    });
  });

  describe('formatAll', () => {
    it('複数の発言を連結してフォーマットできる', () => {
      const sectionedStatements = formatter.addSectionNumbers(sampleStatements);
      const result = formatter.formatAll(sectionedStatements);

      const expected = [
        '【セクション：0001】[話者1][10:30]\n最初の発言',
        '【セクション：0002】[話者2][10:35]\n2番目の発言',
        '【セクション：0003】[話者1][10:40]\n3番目の発言'
      ].join('\n\n');

      expect(result).toBe(expected);
    });

    it('空の配列は空文字列を返す', () => {
      const result = formatter.formatAll([]);
      expect(result).toBe('');
    });
  });

  describe('generateStatistics', () => {
    it('統計情報を正しく生成できる', () => {
      const statements: Statement[] = [
        { speakerNumber: 1, time: '10:00', content: 'あいうえお' },
        { speakerNumber: 2, time: '10:05', content: 'かきくけこさしすせそ' },
        { speakerNumber: 1, time: '10:10', content: 'たちつてと' },
        { speakerNumber: 3, time: '10:15', content: 'なにぬねの' }
      ];

      const result = formatter.generateStatistics(statements);

      expect(result).toContain('総セクション数: 4');
      expect(result).toContain('話者数: 3');
      expect(result).toContain('総文字数: 30');
      expect(result).toContain('話者1: 2回');
      expect(result).toContain('話者2: 1回');
      expect(result).toContain('話者3: 1回');
    });

    it('空の配列でも統計を生成できる', () => {
      const result = formatter.generateStatistics([]);

      expect(result).toContain('総セクション数: 0');
      expect(result).toContain('話者数: 0');
      expect(result).toContain('総文字数: 0');
    });

    it('話者番号順にソートされる', () => {
      const statements: Statement[] = [
        { speakerNumber: 10, time: '10:00', content: 'テスト' },
        { speakerNumber: 2, time: '10:05', content: 'テスト' },
        { speakerNumber: 5, time: '10:10', content: 'テスト' }
      ];

      const result = formatter.generateStatistics(statements);
      const lines = result.split('\n');
      
      const speakerLines = lines.filter(line => line.includes('話者'));
      expect(speakerLines[speakerLines.length - 3]).toContain('話者2');
      expect(speakerLines[speakerLines.length - 2]).toContain('話者5');
      expect(speakerLines[speakerLines.length - 1]).toContain('話者10');
    });
  });
});