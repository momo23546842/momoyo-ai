# Implementation Plan — momoyo-ai

> 🇯🇵 [日本語版はこちら](#japanese)

## Project Overview

A personal digital twin portfolio website where visitors can learn about me, have a conversation with an AI version of me, and book a meeting — all in one place.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| AI Voice/Chat | Vapi |
| AI Model | Groq AI |
| Database | Neon (PostgreSQL) |
| ORM | Prisma |
| Calendar | Google Calendar API |
| Email | Resend |
| Deployment | Vercel |

---

## Architecture Overview

```
Visitor
  │
  ▼
Next.js (Vercel)
  ├── UI Layer (Tailwind CSS)
  ├── API Routes
  │     ├── /api/vapi        → Vapi webhook & Function Calling
  │     ├── /api/profile     → Fetch profile data from DB (MCP)
  │     ├── /api/booking     → Create/manage bookings
  │     └── /api/conversation → Save conversation history
  │
  ├── Vapi (Voice/Chat)
  │     └── Function Calling → API Routes → DB (profile info)
  │           └── Groq AI (LLM for responses)
  │
  ├── Google Calendar API
  │     ├── freebusy.query   → Check availability
  │     └── events.insert    → Create booking
  │
  ├── Resend
  │     └── Email notifications on booking
  │
  └── Neon (PostgreSQL) via Prisma
        ├── Profile
        ├── Resume
        ├── Conversation
        ├── Booking
        └── AvailableHours
```

---

## Page Structure

Single-page scroll layout:

| Section | Content |
|---|---|
| Hero | Name, catchphrase, AI conversation button |
| About | Personal background, personality |
| Career | Work and education timeline |
| Skills | Technical skill set |
| Works | Projects and activities |
| Booking | Schedule a meeting (calendar UI) |
| Contact | Contact form |

**Floating Button** — Fixed position (bottom-right), accessible from any section. Opens voice or chat mode.

---

## Database Schema (Prisma)

```prisma
model Profile {
  id        Int      @id @default(autoincrement())
  name      String
  bio       String
  catchphrase String?
  updatedAt DateTime @updatedAt
}

model Resume {
  id          Int      @id @default(autoincrement())
  type        String   // "work" | "education"
  title       String
  organization String
  startDate   DateTime
  endDate     DateTime?
  description String?
  createdAt   DateTime @default(now())
}

model Skill {
  id       Int    @id @default(autoincrement())
  name     String
  category String // e.g. "Frontend", "Backend", "Tools"
  level    Int    // 1-5
}

model Conversation {
  id        Int      @id @default(autoincrement())
  sessionId String
  role      String   // "user" | "assistant"
  message   String
  mode      String   // "voice" | "chat"
  createdAt DateTime @default(now())
}

model Booking {
  id            Int      @id @default(autoincrement())
  name          String
  email         String
  startTime     DateTime
  endTime       DateTime
  googleEventId String?
  createdAt     DateTime @default(now())
}

model AvailableHours {
  id        Int     @id @default(autoincrement())
  dayOfWeek Int     // 0=Sun, 1=Mon, ..., 6=Sat
  startTime String  // "10:00"
  endTime   String  // "21:00"
  isActive  Boolean @default(true)
}
```

---

## Vapi + Groq AI + MCP Flow

```
Visitor speaks/types
       │
       ▼
    Vapi Agent
       │
       ├── "Tell me about your skills"
       │       └── Function Call → GET /api/profile → DB
       │
       ├── "I want to book a meeting"
       │       └── Function Call → GET /api/booking/availability → Google Calendar
       │                        → POST /api/booking → DB + Google Calendar + Resend
       │
       └── Groq AI generates natural language response
```

Vapi Function Tools:
- `getProfile` — Fetch profile/bio from DB
- `getSkills` — Fetch skills from DB
- `getCareer` — Fetch resume/career from DB
- `checkAvailability` — Check Google Calendar free slots
- `createBooking` — Create a booking

---

## Implementation Phases

### Phase 1 — Environment Setup
- [x] Create Next.js project
- [x] Push to GitHub
- [ ] Set up Neon DB on Vercel
- [ ] Install and configure Prisma
- [ ] Define and migrate DB schema
- [ ] Set up environment variables

### Phase 2 — Profile Page (UI)
- [ ] Build single-page scroll layout
- [ ] Hero section
- [ ] About section
- [ ] Career timeline
- [ ] Skills section
- [ ] Works section
- [ ] Contact section

### Phase 3 — Vapi Integration (Chat)
- [ ] Set up Vapi account and assistant
- [ ] Build floating button UI (voice/chat toggle)
- [ ] Integrate Vapi chat in the frontend
- [ ] Build `/api/profile` endpoint (MCP)
- [ ] Connect Vapi Function Calling to profile API
- [ ] Connect Groq AI as LLM

### Phase 4 — Vapi Integration (Voice)
- [ ] Enable voice mode in Vapi
- [ ] Test voice conversation flow
- [ ] Voice booking via Function Calling

### Phase 5 — Booking System
- [ ] Set up Google Calendar API credentials
- [ ] Build availability check endpoint
- [ ] Build booking creation endpoint
- [ ] Build Booking UI (calendar picker)
- [ ] Set up Resend for email notifications
- [ ] Test end-to-end booking flow

### Phase 6 — Polish & Deploy
- [ ] Responsive design check
- [ ] Performance optimization
- [ ] Deploy to Vercel
- [ ] Custom domain (optional)
- [ ] Final testing

---

<a name="japanese"></a>

# 実装計画 — momoyo-ai（日本語）

## プロジェクト概要

自分のデジタルツイン ポートフォリオサイト。訪問者がWebページで自己紹介を見て、AIと会話し、ミーティングの予約まで完結できる。

---

## アーキテクチャ概要

- **Next.js**：フロントエンド＋APIルート
- **Vapi**：音声・チャットのAIエージェント
- **Groq AI**：LLMとして自然な返答を生成
- **MCP（Function Calling）**：VapiがAPIを呼び出しDBから情報取得
- **Neon + Prisma**：プロフィール・経歴・予約・会話履歴を管理
- **Google Calendar API**：空き時間確認・予定登録
- **Resend**：予約確認メール送信
- **Vercel**：デプロイ

---

## 実装フェーズ

### Phase 1 — 環境構築
- [x] Next.jsプロジェクト作成
- [x] GitHubにpush
- [ ] VercelでNeon DB作成
- [ ] Prismaの導入・スキーマ定義・マイグレーション
- [ ] 環境変数の設定

### Phase 2 — プロフィールページ（UI）
- [ ] 1ページスクロール型レイアウト構築
- [ ] 各セクション実装（Hero / About / Career / Skills / Works / Booking / Contact）

### Phase 3 — Vapi連携（チャット）
- [ ] Vapiアカウント・アシスタント設定
- [ ] フローティングボタンUI実装
- [ ] チャット機能の組み込み
- [ ] `/api/profile` エンドポイント構築（MCP）
- [ ] VapiのFunction CallingとAPIを接続
- [ ] Groq AIをLLMとして接続

### Phase 4 — Vapi連携（音声）
- [ ] 音声モード有効化
- [ ] 音声会話フローのテスト
- [ ] 音声での予約機能実装

### Phase 5 — 予約システム
- [ ] Google Calendar API認証設定
- [ ] 空き時間確認エンドポイント
- [ ] 予約作成エンドポイント
- [ ] カレンダーUI実装
- [ ] Resendでメール通知設定
- [ ] 予約フローの動作確認

### Phase 6 — 仕上げ・デプロイ
- [ ] レスポンシブデザイン確認
- [ ] パフォーマンス最適化
- [ ] Vercelにデプロイ
- [ ] 最終テスト
