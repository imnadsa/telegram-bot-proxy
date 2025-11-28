export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Получаем данные из тела запроса
  const { name, phone } = req.body

  // Проверяем обязательные поля
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' })
  }

  try {
    // Формируем сообщение
    const message = `🔔 Новая заявка из попапа

👤 Имя: ${name}
📞 Телефон: ${phone}

📅 Дата: ${new Date().toLocaleString('ru-RU')}`

    // Берем токен из переменной окружения (защищено!)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error('Missing environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Отправляем сообщение в Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
