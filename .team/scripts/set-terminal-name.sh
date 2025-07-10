#!/bin/bash

# VSCodeターミナル名設定スクリプト
# 使用方法: ./set-terminal-name.sh [名前]

NAME=${1:-"Unnamed"}
TEAM_DIR="$(dirname "$0")/.."

# ターミナルタイトルを設定
echo -e "\033]0;${NAME}\007"

# PS1プロンプトも変更（オプション）
export PS1="[${NAME}] \w $ "

# 環境変数として設定
export TERMINAL_NAME="${NAME}"

echo "ターミナル名を '${NAME}' に設定しました"

# .bashrcに追加する設定を表示
echo ""
echo "永続的に設定する場合は、以下を ~/.bashrc に追加してください："
echo "----------------------------------------"
echo "# ターミナル名設定"
echo "export TERMINAL_NAME=\"${NAME}\""
echo "export PS1=\"[${NAME}] \w $ \""
echo "echo -e '\033]0;${NAME}\007'"
echo "----------------------------------------"