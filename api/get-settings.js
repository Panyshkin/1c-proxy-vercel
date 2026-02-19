// Пример для get-settings.js
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
    // Здесь ваш код для получения данных из 1С
    // Например, отправка запроса к 1С с авторизацией

    // Тестовый ответ (замените на реальные данные из 1С)
    const data = {
      success: true,
      mechanics: ['Иванов Иван', 'Петров Петр'],
      materials: [
        {id: 1, name: 'Расходные материалы', price: 150},
        {id: 2, name: 'Грузик набивной', price: 50}
      ],
      services: [
        {id: 1, name: 'Съём и установка колеса', price: 300, radius: null, carType: null, lowProfile: null, runflat: null}
      ]
    };

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}