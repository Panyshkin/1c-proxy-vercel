import fetch from 'node-fetch';

export default async function handler(req, res) {
  // ========== НАСТРОЙКА CORS ==========
  const allowedOrigins = [
    'https://panyshkin.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // ========== ОБРАБОТКА PREFLIGHT (OPTIONS) ==========
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ========== ТОЛЬКО POST ЗАПРОСЫ ==========
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Метод не поддерживается. Используйте POST.' 
    });
  }

  try {
    // ========== ПОЛУЧАЕМ ДАННЫЕ ОТ КЛИЕНТА ==========
    console.log('📦 Получен запрос от клиента');
    
    const clientData = req.body;

    // Проверка наличия action
    if (!clientData.action) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствует поле action'
      });
    }

    // Проверка, что это правильный тип заказа
    if (clientData.action !== 'create_order_tyre') {
      return res.status(400).json({
        success: false,
        error: `Неверное действие: ${clientData.action}. Ожидается create_order_tyre`
      });
    }

    // Проверка наличия данных
    if (!clientData.data) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют данные заказа (data)'
      });
    }

    // ========== ПОЛУЧАЕМ УЧЁТНЫЕ ДАННЫЕ ИЗ VERCEL ==========
    const login1C = process.env.LOGIN_1C;
    const password1C = process.env.PASSWORD_1C;
    
    if (!login1C || !password1C) {
      console.error('❌ Отсутствуют учётные данные для 1С в переменных окружения');
      return res.status(500).json({
        success: false,
        error: 'Ошибка конфигурации сервера: отсутствуют учётные данные'
      });
    }

    // ========== ЛОГИРУЕМ ПОЛУЧЕННЫЕ ДАННЫЕ (с проверкой типов) ==========
    console.log('👤 Менеджер:', clientData.data.manager);
    console.log('👤 Клиент:', clientData.data.client?.name);
    console.log('📞 Телефон:', clientData.data.client?.phone);
    console.log('🚗 Авто:', clientData.data.client?.car);
    console.log('🛞 Колёса:', `R${clientData.data.wheels?.radius}`, 
      `x${clientData.data.wheels?.qty}`);

    // Безопасно считаем материалы
    let materialsCount = 0;
    if (clientData.data.materials) {
      if (Array.isArray(clientData.data.materials)) {
        materialsCount = clientData.data.materials.filter(m => m.qty > 0).length;
      } else if (typeof clientData.data.materials === 'string') {
        materialsCount = clientData.data.materials.split(',').filter(s => s.trim()).length;
      }
    }
    console.log('📦 Материалов:', materialsCount);

    // Безопасно считаем услуги
    let servicesCount = 0;
    if (clientData.data.services) {
      if (Array.isArray(clientData.data.services)) {
        servicesCount = clientData.data.services.filter(s => s.qty > 0).length;
      } else if (typeof clientData.data.services === 'string') {
        servicesCount = clientData.data.services.split(',').filter(s => s.trim()).length;
      }
    }
    console.log('🔧 Услуг:', servicesCount);

    // ========== ОТПРАВЛЯЕМ ЗАПРОС В 1С ==========
    const url1C = process.env.URL_1C || 'https://homesrv.corp.rarus-cloud.ru/ut2/hs/anketa/send';
    
    console.log('🔄 Отправка запроса в 1С...');
    
    const response = await fetch(url1C, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(login1C + ':' + password1C).toString('base64')
      },
      body: JSON.stringify(clientData)
    });

    // Получаем ответ от 1С
    const responseText = await response.text();
    console.log(`✅ Ответ от 1С, статус: ${response.status}`);

    // Пытаемся распарсить JSON ответ
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📄 Ответ (JSON):', JSON.stringify(responseData).substring(0, 200));
    } catch (e) {
      responseData = { raw: responseText };
      console.log('📄 Ответ (текст):', responseText.substring(0, 200));
    }

    // Извлекаем номер заказа
    const orderNumber = responseData.orderNumber || 
                       responseData.Номер || 
                       responseData.number ||
                       responseData.ЗаказНомер ||
                       'не указан';

    // ========== ОТПРАВЛЯЕМ ОТВЕТ КЛИЕНТУ ==========
    res.status(response.status).json({
      success: response.status >= 200 && response.status < 300,
      code: response.status,
      orderNumber: orderNumber,
      message: responseText,
      _debug: {
        timestamp: new Date().toISOString(),
        hasData: !!clientData.data
      }
    });

  } catch (error) {
    console.error('❌ Ошибка прокси:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      _debug: {
        timestamp: new Date().toISOString()
      }
    });
  }
}
