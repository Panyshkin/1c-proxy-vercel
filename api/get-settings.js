// /api/get-settings.js
export default async function handler(req, res) {
  // Разрешаем CORS (важно для работы с браузера)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем preflight-запрос (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Принимаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается. Используйте POST.' });
  }

  try {
    const { subdivision } = req.body;

    // Берём учётные данные из переменных окружения Vercel
    const login = process.env.LOGIN_1C;
    const password = process.env.PASSWORD_1C;

    if (!login || !password) {
      throw new Error('Не заданы учётные данные для 1С');
    }

    // Формируем запрос к 1С
    const payload = {
      action: 'create_order_tyre_get_settings',
      data: { subdivision }
    };

    const response = await fetch('https://homesrv.corp.rarus-cloud.ru/ut2/hs/anketa/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(login + ':' + password).toString('base64')
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: false, error: 'Ответ от 1С не является JSON' };
    }

    // Отправляем клиенту то, что вернула 1С
    res.status(response.ok ? 200 : 500).json(data);

  } catch (error) {
    console.error('Ошибка в прокси:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
