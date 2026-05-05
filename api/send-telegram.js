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

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Telegram API error:', error)
      throw new Error(`Telegram error: ${response.status}`)
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

