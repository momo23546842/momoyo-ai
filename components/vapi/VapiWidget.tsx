'use client'

import { useEffect, useRef, useState } from 'react'
import Vapi from '@vapi-ai/web'

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!)

export default function VapiWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const startCall = async () => {
    await vapi.start({
      assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!,
    })
    setIsConnected(true)
  }

  const endCall = () => {
    vapi.stop()
    setIsConnected(false)
    setIsOpen(false)
  }

  useEffect(() => {
    vapi.on('speech-start', () => setIsSpeaking(true))
    vapi.on('speech-end', () => setIsSpeaking(false))
  }, [])

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-black text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-gray-800 transition z-50"
      >
        💬
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 bg-white rounded-2xl shadow-2xl p-6 w-72 z-50">
          <h3 className="text-lg font-bold mb-2">Talk with Momoyo</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isConnected ? isSpeaking ? '話しています...' : '聞いています...' : 'AIと話してみましょう！'}
          </p>
          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={startCall}
                className="flex-1 bg-black text-white py-2 rounded-full hover:bg-gray-800 transition"
              >
                通話開始
              </button>
            ) : (
              <button
                onClick={endCall}
                className="flex-1 bg-red-500 text-white py-2 rounded-full hover:bg-red-600 transition"
              >
                終了
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border rounded-full hover:bg-gray-100 transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}