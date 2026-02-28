# Progress Log — momoyo-ai

## 2026/02/22

### ✅ Phase 1 - Environment Setup
- Next.jsプロジェクト作成（momoyo-ai）
- GitHubにリポジトリ作成・push
- README.md作成（英語・日本語）
- IMPLEMENTATION_PLAN.md作成
- AGENT.md作成
- Neon DBセットアップ（Vercel経由）
- Prisma導入・スキーマ定義・マイグレーション（init）
- `lib/prisma.ts` 作成（PrismaClientシングルトン）
- Vercelに環境変数（DATABASE_URL）追加

### 🚧 Phase 2 - Profile Page UI（進行中）
- `app/page.tsx` を1ページスクロール型レイアウトに変更
- 各セクションの空コンポーネント作成
  - Hero / About / Career / Skills / Works / Booking / Contact
- `app/api/profile/route.ts` 作成
  - GETリクエストでDBのProfileテーブルからデータを取得して返すAPI
  - VapiのFunction CallingからこのAPIを呼び出す予定

### 📝 次にやること
- `/api/career` エンドポイント作成
- `/api/skills` エンドポイント作成
- DBにプロフィール・経歴・スキルデータを登録
- UIはV0を使って後から作成予定

---

## 2026/02/28

### ✅ Google Calendar 予約機能の実装・修正

#### Booking コンポーネント修正
- `components/booking.tsx` がビルドエラーで壊れていた（古いコードと新しいコードが混在）
- 完全に書き直し：4ステップUI（カレンダー → 時間スロット → フォーム → 確認画面）

#### Availability API (`app/api/booking/availability/route.ts`)
- **問題1**: `googleapis` パッケージがVercelサーバーレス環境でクラッシュ（バンドルサイズ超過）
  - 解決：`googleapis` を削除し、直接REST API + 手動JWT認証に切り替え（Node.js `crypto` で署名）
- **問題2**: タイムゾーンオフセットが `+11:00` にハードコードされていた
  - 解決：AEST（+10:00）/ AEDT（+11:00）を月に応じて動的に切り替え
- **問題3**: エラー時にスロットが全く表示されなかった
  - 解決：Google Calendar APIがエラーでもスロットを返すように変更（全スロットavailableとして表示）

#### Create API (`app/api/booking/create/route.ts`)
- **問題1**: `googleapis` 依存を同様にREST API + JWTに切り替え
- **問題2**: `attendees` フィールドで403エラー
  - 原因：無料Googleアカウントではサービスアカウントから他ユーザーを招待できない
  - 解決：`attendees` を削除し、予約者情報をイベントの説明欄（description）に記載する方式に変更
- **問題3**: 403 Calendar error
  - 原因：サービスアカウントにカレンダーの書き込み権限がなかった + `attendees` の制限
  - 解決：Google カレンダーの共有設定で「Make changes to events」を付与 + attendees削除

#### Vercel 環境変数の問題
- `GOOGLE_PRIVATE_KEY`: Vercelで「whitespace and return characters」警告 → 1行で貼り直しで解決
- `GOOGLE_CALENDAR_ID`: 変数名にタイポ（`G`が抜けていた） → 修正後Redeployで解決
- 環境変数変更後にRedeployが必要（設定だけでは反映されない）

#### ヘッダーナビ
- `components/header.tsx` の `navLinks` に「Booking」リンクを追加

### ✅ AIアシスタント チャット/Voice 予約連携

#### チャット内予約フロー
- チャットで「Book a meeting on March 10」→ 空き時間ボタン表示 → 時間選択 → フォーム入力 → 予約完了（全てチャット内で完結）
- 日付パーサー実装：「March 10」「3/10」「3月10日」「next Tuesday」「tomorrow」「明日」に対応
- 予約キーワードなしでも日付+質問（「What's free on March 10?」「3月10日空いてる？」）で空き時間を表示

#### Voice改善
- **短い応答**: 挨拶・スロット紹介を大幅に短縮（150文字超は切り詰め）
- **割り込み対応**: AI発話中に「Interrupt」ボタンでユーザーが即座に発言可能
- **話すスピード**: 1.0 → 1.15倍に高速化
- **Voice→Chat連携**: 音声で日付を言う → 短く空き時間読み上げ → 自動でChatタブに切り替え → スロット選択UI表示
- **日付対応**: 音声でも「March 10」「next Friday」で空き時間検索可能

#### Chat API (`app/api/chat/route.ts`)
- システムプロンプトに予約検知ルールを追加（`[BOOKING_LINK]` タグ生成）
- フォールバック関数にも予約キーワード検知を追加

---

## メモ
- UIデザインはV0で作成予定（Next.js + Tailwindと相性が良い）
- `npx` をつけないとprismaコマンドが動かない（Windows環境）
- Windowsの一時フォルダ権限エラーは `$env:TEMP = "C:\Temp"` で解決

### 未解決の問題
- VapiのFunction CallingでツールはCompletedになるがLLMがデータを使えない
  - 原因：VapiがツールのレスポンスをLLMに正しく渡せていない可能性
  - 試したこと：レスポンスをラップ、モデル変更、システムプロンプト変更
  - 次回：Custom Functionsで試す、またはVapiのServerURLを使ったWebhook方式を検討

## Vercelデプロイ時のトラブルシューティング

### 問題1：重複定義（Duplicate identifier）
- 原因：V0のUIをマージした際にcomponents/ui/内で同じimportやコンポーネントが重複
- 解決：components/ui/内の重複ブロック・importを削除

### 問題2：Prismaクライアントが無い
- 原因：prisma/schema.prismaとmigrationsがコミットされていなかった
- 解決：npx prisma generateを実行し、package.jsonにpostinstallを追加
  "postinstall": "prisma generate"

### 問題3：ライブラリ不足
- 原因：V0のUIで使用しているRadixなどのライブラリが未インストール
- 解決：npm install @radix-ui/react-accordion などを追加

### 問題4：Windows一時フォルダ権限エラー
- 原因：shadcn実行時にTempフォルダへのアクセス権限エラー
- 解決：$env:TEMP = "C:\Temp" で一時フォルダを変更してから実行

### 問題5：googleapis がVercelサーバーレスでクラッシュ（2026/02/28）
- 原因：`googleapis` パッケージが巨大でサーバーレス環境のバンドルサイズ制限に引っかかる
- 解決：`googleapis` を使わず、直接REST API + 手動JWT署名（Node.js crypto）で Google Calendar API を呼び出す

### 問題6：Google Calendar API 403エラー（2026/02/28）
- 原因1：無料Googleアカウントではサービスアカウントから `attendees`（招待者）を追加できない
- 原因2：`GOOGLE_CALENDAR_ID` の環境変数名にタイポがあった
- 解決：`attendees` を削除（予約者情報はdescriptionに記載）、環境変数名を修正、Redeploy
