 export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { name, phone, role, contactMethod, source: sourceKey } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }

    try {
      // Источник заявки: явный параметр source имеет приоритет,
      // fallback — по наличию role (legacy для старых интеграций)
      const sourceMap = {
        hippocrat: '🩺 Hippocrat Digital',
        skolkodeneg: '💊 Сколько Денег',
        skolkoreglamentov: '📋 Сколько Регламентов',
        skolkorassylok: '✉️ Сколько Рассылок',
        ai: '🤖 Hippocrat AI',
      }
      const source =
        sourceMap[sourceKey] || (role ? '💊 Сколько Денег' : '🤖 Hippocrat AI')

      const message = `🔔 Новая заявка — ${source}

  👤 Имя: ${name}
  📞 Телефон: ${phone}${role ? `\n💼 Роль: ${role}` : ''}${contactMethod ? `\n💬 Связаться через: ${contactMethod}` : ''}

  📅 Дата: ${new Date().toLocaleString('ru-RU')}`

      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID

      if (!botToken || !chatId) {
        console.error('Missing environment variables')
        return res.status(500).json({ error: 'Server configuration error' })
      }

      const sendTelegram = (id) =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: id, text: message }),
        })

      // Основной получатель (из env TELEGRAM_CHAT_ID) — критичный.
      const response = await sendTelegram(chatId)

      if (!response.ok) {
        const error = await response.json()
        console.error('Telegram API error:', error)
        throw new Error(`Telegram error: ${response.status}`)
      }

      // Дублируем заявку в общую группу команды (best-effort).
      // Ошибку только логируем, чтобы проблема с группой не ломала отправку лида.
      const TEAM_GROUP_CHAT_ID = '-5203863987'
      try {
        const groupRes = await sendTelegram(TEAM_GROUP_CHAT_ID)
        if (!groupRes.ok) {
          console.error('Telegram group send failed:', await groupRes.json())
        }
      } catch (groupError) {
        console.error('Telegram group send error:', groupError)
      }

      return res.status(200).json({ success: true, message: 'Message sent successfully' })
    } catch (error) {
      console.error('Error:', error)
      return res.status(500).json({ error: error.message })
    }
  }
