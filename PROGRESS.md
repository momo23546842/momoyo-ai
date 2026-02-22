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

## メモ
- UIデザインはV0で作成予定（Next.js + Tailwindと相性が良い）
- `npx` をつけないとprismaコマンドが動かない（Windows環境）
- Windowsの一時フォルダ権限エラーは `$env:TEMP = "C:\Temp"` で解決