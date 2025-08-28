' 議会議事録作成システム用 Word均等割り付けマクロ
' 話者名を4文字幅に均等割り付けするVBAマクロ

' 文書を開いたときに自動実行されるマクロ
Sub AutoOpen()
    ' ボタンを追加
    Call AddEqualizeButton
    
    ' 使用方法を表示
    MsgBox "議会議事録作成システムからダウンロードされたファイルです。" & vbCrLf & vbCrLf & _
           "【使用方法】" & vbCrLf & _
           "1. 「均等割り付け実行」ボタンをクリックして話者名を4文字幅に調整" & vbCrLf & _
           "2. 編集作業を完了" & vbCrLf & _
           "3. 納品前に「納品用に変換」マクロを実行してボタンを削除" & vbCrLf & vbCrLf & _
           "※マクロを有効にしてご使用ください。", vbInformation, "議会議事録作成システム"
End Sub

' 均等割り付け実行ボタンを追加するマクロ
Sub AddEqualizeButton()
    On Error Resume Next
    
    ' 既存のボタンを削除
    CommandBars("Standard").Controls("均等割り付け実行").Delete
    CommandBars("Standard").Controls("納品用に変換").Delete
    
    ' 均等割り付け実行ボタンを追加
    Dim btnEqualize As CommandBarButton
    Set btnEqualize = CommandBars("Standard").Controls.Add(Type:=msoControlButton, Before:=1)
    With btnEqualize
        .Caption = "均等割り付け実行"
        .OnAction = "話者名均等割り付け"
        .Style = msoButtonCaption
        .TooltipText = "話者名を4文字幅に均等割り付けします"
    End With
    
    ' 納品用変換ボタンを追加
    Dim btnConvert As CommandBarButton
    Set btnConvert = CommandBars("Standard").Controls.Add(Type:=msoControlButton, Before:=2)
    With btnConvert
        .Caption = "納品用に変換"
        .OnAction = "納品用に変換"
        .Style = msoButtonCaption
        .TooltipText = "納品用にボタンを削除します"
    End With
    
    On Error GoTo 0
End Sub

' 指定したテキストの幅をポイント単位で取得する関数
Function GetTextWidth(text As String, font As font) As Single
    Dim tempDoc As Document
    Dim tempRange As Range
    Dim tempShape As Shape
    Dim width As Single
    
    ' 一時的なドキュメントを作成
    Set tempDoc = Documents.Add(Visible:=False)
    Set tempRange = tempDoc.Range
    
    ' テキストを挿入
    tempRange.text = text
    tempRange.font = font
    
    ' テキストボックスを作成して幅を測定
    Set tempShape = tempDoc.Shapes.AddTextbox(msoTextOrientationHorizontal, 0, 0, 100, 20)
    tempShape.TextFrame.TextRange.text = text
    tempShape.TextFrame.TextRange.font = font
    tempShape.TextFrame.AutoSize = True
    
    ' 幅を取得
    width = tempShape.width
    
    ' 一時ドキュメントを閉じる
    tempDoc.Close SaveChanges:=wdDoNotSaveChanges
    
    GetTextWidth = width
End Function

' 指定した幅に文字を均等割り付けする関数
Function FitTextWidth(text As String, targetWidth As Single, font As font) As Single
    Dim tempDoc As Document
    Dim tempRange As Range
    Dim tempShape As Shape
    Dim spacing As Single
    Dim currentWidth As Single
    Dim bestSpacing As Single
    Dim minDiff As Single
    Dim i As Single
    
    ' 一時的なドキュメントを作成
    Set tempDoc = Documents.Add(Visible:=False)
    
    ' テキストボックスを作成
    Set tempShape = tempDoc.Shapes.AddTextbox(msoTextOrientationHorizontal, 0, 0, 200, 30)
    tempShape.TextFrame.TextRange.text = text
    tempShape.TextFrame.TextRange.font = font
    
    minDiff = 1000
    bestSpacing = 0
    
    ' 文字間隔を-10から20まで0.1刻みで調整
    For i = -10 To 20 Step 0.1
        tempShape.TextFrame.TextRange.font.spacing = i
        currentWidth = tempShape.width
        
        ' 目標幅との差が最小のものを記録
        If Abs(currentWidth - targetWidth) < minDiff Then
            minDiff = Abs(currentWidth - targetWidth)
            bestSpacing = i
        End If
        
        ' 十分に近い場合は終了
        If minDiff < 0.5 Then Exit For
    Next i
    
    ' 一時ドキュメントを閉じる
    tempDoc.Close SaveChanges:=wdDoNotSaveChanges
    
    FitTextWidth = bestSpacing
End Function

' 話者名を4文字幅に均等割り付けするメインマクロ
Sub 話者名均等割り付け()
    Dim para As Paragraph
    Dim speakerCount As Integer
    Dim fourCharWidth As Single
    Dim baseFont As font
    
    speakerCount = 0
    
    ' 基準となるフォントを取得
    Set baseFont = ActiveDocument.Range.font
    
    ' 4文字分の幅を計算（「あいうえ」の幅を基準）
    fourCharWidth = GetTextWidth("あいうえ", baseFont)
    
    ' 各段落をチェック
    For Each para In ActiveDocument.Paragraphs
        ' 話者名のパターンを認識
        If para.Range.Bold = True And InStr(para.Range.text, "：") > 0 Then
            ' 前の段落がタイムスタンプかチェック
            If Not para.Previous Is Nothing Then
                Dim prevText As String
                prevText = para.Previous.Range.text
                
                ' タイムスタンプのパターンをチェック（例：（00：00：00））
                If InStr(prevText, "（") > 0 And InStr(prevText, "：") > 0 And InStr(prevText, "）") > 0 Then
                    ' 次の段落がインデントされているかチェック
                    If Not para.Next Is Nothing Then
                        If para.Next.LeftIndent > 0 Then
                            ' 話者名と判断
                            speakerCount = speakerCount + 1
                            
                            ' 話者名部分を取得
                            Dim speakerText As String
                            speakerText = Left(para.Range.text, InStr(para.Range.text, "：") - 1)
                            
                            ' 均等割り付けの文字間隔を計算
                            Dim spacing As Single
                            spacing = FitTextWidth(speakerText, fourCharWidth, baseFont)
                            
                            ' 話者名の部分のみに文字間隔を適用
                            Dim speakerRange As Range
                            Set speakerRange = para.Range
                            speakerRange.End = speakerRange.Start + Len(speakerText)
                            speakerRange.font.spacing = spacing
                        End If
                    End If
                End If
            End If
        End If
    Next para
    
    If speakerCount > 0 Then
        MsgBox speakerCount & "件の話者名に均等割り付けを適用しました。", vbInformation, "均等割り付け完了"
    Else
        MsgBox "話者名が見つかりませんでした。" & vbCrLf & _
               "話者名は以下の条件を満たす必要があります：" & vbCrLf & _
               "・太字であること" & vbCrLf & _
               "・「：」を含むこと" & vbCrLf & _
               "・前の段落がタイムスタンプ形式であること" & vbCrLf & _
               "・次の段落がインデントされていること", vbExclamation, "話者名が見つかりません"
    End If
End Sub

' 納品用にボタンを削除するマクロ
Sub 納品用に変換()
    On Error Resume Next
    
    ' ボタンを削除
    CommandBars("Standard").Controls("均等割り付け実行").Delete
    CommandBars("Standard").Controls("納品用に変換").Delete
    
    On Error GoTo 0
    
    MsgBox "納品用に変換しました。" & vbCrLf & vbCrLf & _
           "【納品時の注意事項】" & vbCrLf & _
           "1. 「ファイル」→「名前を付けて保存」で保存してください" & vbCrLf & _
           "2. 必要に応じて「ファイル」→「情報」→「問題のチェック」→" & vbCrLf & _
           "   「ドキュメント検査」でVBAプロジェクトも削除できます" & vbCrLf & _
           "3. 保存時にマクロに関する警告が表示される場合は" & vbCrLf & _
           "   「いいえ」を選択してマクロなしで保存してください", vbInformation, "納品用変換完了"
End Sub

