// /api/get-settings.js (временная отладочная версия)
export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается. Используйте POST.' });
  }

  // ---- НАЧАЛО ОТЛАДКИ ----
  let debugInfo = {};
  // ---- КОНЕЦ ОТЛАДКИ ----

  try {
    const { subdivision } = req.body;
    debugInfo.subdivision = subdivision;

    // Проверяем наличие учётных данных в окружении
    const login = process.env.LOGIN_1C;
    const password = process.env.PASSWORD_1C;
    debugInfo.hasCredentials = !!login && !!password;

    if (!login || !password) {
      throw new Error('LOGIN_1C или PASSWORD_1C не заданы в переменных окружения Vercel');
    }

    const payload = {
      action: 'create_order_tyre_get_settings',
      data: { subdivision }
    };
    debugInfo.payload = payload;

    const url = 'https://homesrv.corp.rarus-cloud.ru/ut2/hs/anketa/send';
    debugInfo.url = url;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(login + ':' + password).toString('base64')
      },
      body: JSON.stringify(payload)
    });

    debugInfo.responseStatus = response.status;
    const responseText = await response.text();
    debugInfo.responseText = responseText.substring(0, 500); // Первые 500 символов ответа

    // Пытаемся распарсить JSON, но если не получается – вернём текст ошибки
    let data;
    try {
      data = JSON.parse(responseText);
      debugInfo.parseSuccess = true;
    } catch (e) {
      debugInfo.parseSuccess = false;
      debugInfo.parseError = e.message;
      // Возвращаем структуру с ошибкой, но с кодом 200, чтобы клиент получил детали
      return res.status(200).json({
        success: false,
        error: 'Ответ от 1С не является JSON',
        rawResponse: responseText,
        debug: debugInfo
      });
    }

    // Возвращаем ответ 1С (даже если data.success === false)
    return res.status(200).json(data);

  } catch (error) {
    console.error('Ошибка в прокси:', error);
    // Возвращаем детали ошибки клиенту с кодом 200, чтобы увидеть их в браузере
    return res.status(200).json({
      success: false,
      error: error.message,
      stack: error.stack,
      debug: debugInfo
    });
  }
}
