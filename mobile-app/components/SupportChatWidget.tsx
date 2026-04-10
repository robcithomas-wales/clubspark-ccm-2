import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { MessageCircle, X, Send } from 'lucide-react-native'
import { useBranding } from '../contexts/BrandingContext'

type Message = { role: 'user' | 'assistant'; content: string }

const SUPPORT_API_URL = process.env.EXPO_PUBLIC_SUPPORT_API_URL ?? 'http://localhost:3001'

const WELCOME: Message = {
  role: 'assistant',
  content: 'Hi! I\'m the club support assistant. Ask me anything about how to use this app.',
}

export function SupportChatWidget() {
  const { branding } = useBranding()
  const primaryColour = branding?.primaryColour ?? '#1857E0'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch(`${SUPPORT_API_URL}/api/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages([...next, { role: 'assistant', content: data.message ?? data.error ?? 'Sorry, something went wrong.' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: primaryColour,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 50,
        }}
        accessibilityLabel="Open support chat"
      >
        <MessageCircle size={24} color="#fff" />
      </TouchableOpacity>

      {/* Chat modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={{ backgroundColor: primaryColour, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Club Support</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Ask us anything</Text>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m, i) => (
              <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '85%',
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: m.role === 'user' ? primaryColour : '#f1f5f9',
                  }}
                >
                  <Text style={{ color: m.role === 'user' ? '#fff' : '#1e293b', fontSize: 14, lineHeight: 22 }}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))}

            {loading && (
              <View style={{ alignItems: 'flex-start' }}>
                <View style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f1f5f9' }}>
                  <ActivityIndicator size="small" color={primaryColour} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question..."
                placeholderTextColor="#94a3b8"
                editable={!loading}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                }}
                onSubmitEditing={send}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity
                onPress={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: primaryColour,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !input.trim() || loading ? 0.4 : 1,
                  alignSelf: 'flex-end',
                }}
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  )
}
