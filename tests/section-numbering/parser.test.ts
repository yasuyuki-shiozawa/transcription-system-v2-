import { NottaParser } from '../../src/section-numbering/parser';

describe('NottaParser', () => {
  let parser: NottaParser;

  beforeEach(() => {
    parser = new NottaParser();
  });

  describe('parse', () => {
    it('正常な入力をパースできる', () => {
      const input = `話者 1 05:18

テスト発言1です。

話者 2 05:27

テスト発言2です。`;

      const result = parser.parse(input);

      expect(result.statements).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      
      expect(result.statements[0]).toEqual({
        speakerNumber: 1,
        time: '05:18',
        content: 'テスト発言1です。'
      });
      
      expect(result.statements[1]).toEqual({
        speakerNumber: 2,
        time: '05:27',
        content: 'テスト発言2です。'
      });
    });

    it('複数行の発言を正しく処理できる', () => {
      const input = `話者 1 10:30

これは最初の行です。
これは2行目です。
これは3行目です。

話者 2 10:35

別の発言です。`;

      const result = parser.parse(input);

      expect(result.statements).toHaveLength(2);
      expect(result.statements[0].content).toBe(
        'これは最初の行です。\nこれは2行目です。\nこれは3行目です。'
      );
    });

    it('話者番号が2桁でも正しくパースできる', () => {
      const input = `話者 10 15:45

10番の話者です。

話者 99 15:50

99番の話者です。`;

      const result = parser.parse(input);

      expect(result.statements).toHaveLength(2);
      expect(result.statements[0].speakerNumber).toBe(10);
      expect(result.statements[1].speakerNumber).toBe(99);
    });

    it('話者情報のない行はエラーとして報告される', () => {
      const input = `これは話者情報のない行です。

話者 1 12:00

正常な発言です。`;

      const result = parser.parse(input);

      expect(result.statements).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('話者情報が見つからない');
    });

    it('空の入力は空の結果を返す', () => {
      const result = parser.parse('');
      
      expect(result.statements).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('連続した空行を正しく処理できる', () => {
      const input = `話者 1 08:00

発言1


話者 2 08:05

発言2`;

      const result = parser.parse(input);

      expect(result.statements).toHaveLength(2);
      expect(result.statements[0].content).toBe('発言1');
      expect(result.statements[1].content).toBe('発言2');
    });
  });

  describe('isValidFormat', () => {
    it('正しいフォーマットを検証できる', () => {
      const validInput = `話者 1 10:30

これは発言です。`;

      expect(parser.isValidFormat(validInput)).toBe(true);
    });

    it('無効なフォーマットを検出できる', () => {
      const invalidInput = `これは無効な形式です。
話者情報がありません。`;

      expect(parser.isValidFormat(invalidInput)).toBe(false);
    });

    it('空の入力はfalseを返す', () => {
      expect(parser.isValidFormat('')).toBe(false);
    });

    it('空白行のみの入力はfalseを返す', () => {
      expect(parser.isValidFormat('\n\n\n')).toBe(false);
    });
  });
});