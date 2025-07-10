#!/usr/bin/env python3
import subprocess
import sys
import os

# docファイルをテキストに変換（antiwordまたはcatdocを使用）
doc_path = sys.argv[1] if len(sys.argv) > 1 else "/mnt/c/Users/shioz/Downloads/transcription-system/docs/templates/sample_format.doc"

# まずはstringsコマンドで基本的なテキストを抽出
try:
    result = subprocess.run(['strings', doc_path], capture_output=True, text=True)
    
    # 日本語文字を含む行のみを抽出
    lines = result.stdout.split('\n')
    japanese_lines = []
    
    for line in lines:
        # 行に日本語が含まれているかチェック
        if any('\u3040' <= char <= '\u309f' or  # ひらがな
               '\u30a0' <= char <= '\u30ff' or  # カタカナ
               '\u4e00' <= char <= '\u9fff'     # 漢字
               for char in line):
            # 制御文字を除去
            clean_line = ''.join(char for char in line if char.isprintable() or char in '\n\t')
            if clean_line.strip():
                japanese_lines.append(clean_line)
    
    print("=== 抽出されたテキスト内容 ===")
    for line in japanese_lines[:50]:  # 最初の50行を表示
        print(line)
        
except Exception as e:
    print(f"エラー: {e}")

# ファイルサイズ情報
print(f"\n=== ファイル情報 ===")
print(f"ファイルサイズ: {os.path.getsize(doc_path)} bytes")