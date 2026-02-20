# momoyo-ai

> 🇯🇵 [日本語版はこちら](#japanese)

## Overview

**momoyo-ai** is a personal digital twin portfolio website. Visitors can learn about me through the website, have a conversation with an AI version of me, and even book a meeting — all in one place.

## Features

- 🧠 **AI Conversation** — Chat or talk with an AI assistant powered by [Vapi](https://vapi.ai), trained on my profile and background
- 📅 **Smart Booking** — Book a meeting by checking my real-time availability via Google Calendar API
- 🎙️ **Voice Booking** — Book a meeting through voice conversation with the AI assistant
- 📬 **Email Notifications** — Automatic email confirmations for both parties via Resend
- 💾 **Conversation History** — All conversations are saved to the database

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| AI Voice/Chat | Vapi |
| Database | Neon (PostgreSQL) |
| ORM | Prisma |
| Calendar | Google Calendar API |
| Email | Resend |
| Deployment | Vercel |

## Page Structure

Single-page scroll layout with the following sections:

- **Hero** — Introduction and AI conversation button
- **About** — Personal background and personality
- **Career** — Work and education timeline
- **Skills** — Technical skill set
- **Works** — Projects and activities
- **Booking** — Schedule a meeting
- **Contact** — Get in touch

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/momoyo-ai.git
cd momoyo-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

```env
DATABASE_URL=
VAPI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
RESEND_API_KEY=
```

---

<a name="japanese"></a>

# momoyo-ai（日本語）

**momoyo-ai** は個人のデジタルツイン ポートフォリオサイトです。訪問者はWebページで私のことを知り、AIと会話し、ミーティングの予約まで行うことができます。

## 機能

- 🧠 **AI会話** — [Vapi](https://vapi.ai) を使った音声・チャット対応のAIアシスタント（私のプロフィールをもとに学習済み）
- 📅 **スマート予約** — Google Calendar APIで私のリアルタイムの空き時間を確認して予約可能
- 🎙️ **音声予約** — AIとの音声会話を通じて予約が完結
- 📬 **メール通知** — Resendを使った予約確認メールの自動送信
- 💾 **会話履歴保存** — 全ての会話をデータベースに保存

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js (App Router) |
| スタイリング | Tailwind CSS |
| AI音声・チャット | Vapi |
| データベース | Neon (PostgreSQL) |
| ORM | Prisma |
| カレンダー | Google Calendar API |
| メール | Resend |
| デプロイ | Vercel |

## ページ構成

1ページスクロール型で以下のセクションで構成：

- **Hero** — 自己紹介とAI会話ボタン
- **About** — プロフィール・人柄
- **Career** — 経歴タイムライン
- **Skills** — スキル一覧
- **Works** — 制作物・活動
- **Booking** — ミーティング予約
- **Contact** — 連絡先

