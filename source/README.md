# 雷轟 練習アプリ — ソース

アプリの元になるファイル一式です。`build.py` でまとめると、遊べるアプリになります。
（v35 から。それまでの「完成HTMLに差分パッチを重ねる」作り方はやめました）

## 作る・確かめる

```
python3 source/build.py              # アプリを作る（dist/raigou_app.html ＋ ホーム画面版をリポジトリ直下に）
python3 source/build.py --check      # dist だけ作る（公開中のファイルは書き換えない）
node source/tests/run_tests.js       # 自動テスト（画面なしで約1〜2分）
node source/tests/run_tests.js --quick
```

- `dist/raigou_app.html` … 1ファイル版（BGM込み。ファイルとして直接開いて遊べる）
- リポジトリ直下の `index.html` `sw.js` など … ホーム画面版（GitHub Pages で公開）
- バージョンは `source/VERSION` の1か所だけ。設定画面と `sw.js` に自動で入る

## フォルダの中身

| 場所 | 中身 |
|---|---|
| `js/engine/` | ルール（駒・役と得点・手番・言霊の効果・禁忌・終局）。**画面を直接さわらない** |
| `js/ai/` | AI（Lv.1〜7）。これも画面をさわらない |
| `js/ui/` | 画面・ポップアップ・演出・あなたの操作 |
| `js/audio/` | 効果音・BGM・ジングル |
| `js/app/` | 設定・戦績・バージョン・起動時の読み込み |
| `js/ORDER.txt` | JS をつなげる順番 |
| `css/` | 見た目。`ORDER.txt` の順につなげる（後ろほど優先。`30-theme-denno` 以降が今の見た目） |
| `html/` | 画面の骨組み |
| `assets/` | 画像・音（ビルド時にファイルの中に埋め込まれる） |
| `assets/chara/<家ID>/` | キャラ1人分（下の「キャラを追加する」） |
| `pwa/` | ホーム画面版の付属ファイル（アイコン・manifest・sw.js） |
| `tests/` | 自動テスト（node で動く） |

## ルールと画面のつなぎ目（VIEW）

`engine/` と `ai/` は、表示・演出・あなたへの質問をすべて `VIEW.〇〇()` を通して行います。

- `js/engine/view.js` … VIEW の一覧と「画面がないとき」の動き（何もしない／すぐ終わる）
- `js/ui/view-bind.js` … ブラウザで、VIEW を本物の画面の処理につなぐ

このおかげで、ルールとAIだけを node で動かせます（`tests/headless.js`）。
ルール側に新しい演出や質問が必要になったら、`view.js` に名前を足し、`view-bind.js` でつなぎます。
テスト「0.」が、ルール側で `document` などを直接使っていないかを見張っています。

## キャラを追加する

1. `assets/chara/<家ID>/` を作る（家ID：`yakumo` 八雲／`hisetsu` 飛雪／`tobari` 帳）
2. 画像を9枚置く（名前は固定。拡張子は webp か jpg）

   | ファイル | 中身 | 目安 |
   |---|---|---|
   | `hero` | 通常の立ち絵（引き分けの結果画面） | 横440px・透明背景 |
   | `win` / `lose` | 勝利・敗北の立ち絵（結果画面） | 横440px・透明背景 |
   | `cutin` | カットイン（左向き。言霊・VS・雷轟合戦） | 縦900px・透明背景 |
   | `avatar` `avatar_act` `avatar_hit` `avatar_joy` | アイコン：通常・発動・受けた・笑顔 | 240×240・黒系の背景 |
   | `tile` | キャラ選択のタイル（顔中心） | 260×260・透明背景 |

3. `chara.json` を置く

   ```json
   { "name": "八雲 〇〇", "yomi": "やくも 〇〇", "color": "#xxxxxx", "colorSoft": "#xxxxxx" }
   ```
   - `color` … メインカラー（UIの黄色の部分がこの色になる）。AIの青紫 `#7d6bff`・警告の赤 `#ff4d5e` と見分けがつく色に
   - `colorSoft` … メインカラーの薄い色
   - 必要なら `"css"`（そのキャラだけの見た目の調整）と `"cssNote"`（その説明）。例は `shigure/chara.json`

4. `python3 source/build.py` → 選択画面で選べるようになる（「準備中」が外れる）

名前の一覧・タイル・色・画像セットは、ビルドがフォルダから自動で作ります。JS や CSS を書き換える必要はありません。
