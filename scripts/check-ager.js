const url = 'https://ager.ua/yml_prom/?code=uk&param=8498svg';

async function main() {
  console.log('Загружаем XML AGER...');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Ошибка загрузки XML: HTTP ${response.status}`);
  }

  const xml = await response.text();

  console.log('XML загружен.');
  console.log('Размер XML:', Math.round(xml.length / 1024 / 1024), 'МБ');

  const offers = [
    ...xml.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi)
  ];

  console.log('Всего предложений:', offers.length);

  const results = [];
  const seen = new Set();

  for (const match of offers) {
    const attributes = match[1];
    const body = match[2];

    const getAttribute = (name) => {
      const found = attributes.match(
        new RegExp(`\\b${name}=['"]([^'"]*)['"]`, 'i')
      );
      return found ? found[1] : '';
    };

    const getTag = (tag) => {
      const found = body.match(
        new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      );
      return found
        ? found[1].replace(/<[^>]*>/g, '').trim()
        : '';
    };

    const name = getTag('name');
    const params = [];

    for (const p of body.matchAll(
      /<param\b([^>]*)>([\s\S]*?)<\/param>/gi
    )) {
      const nameMatch = p[1].match(/\bname=['"]([^'"]+)['"]/i);
      if (!nameMatch) continue;

      const paramName = nameMatch[1];
      const value = p[2].replace(/<[^>]*>/g, '').trim();

      if (/артик|код|sku|article|модель|товарн.*номер/i.test(paramName)) {
        params.push(`${paramName}=${value}`);
      }
    }

    const key = getAttribute('group_id') + '|' + name;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id: getAttribute('id'),
      group: getAttribute('group_id'),
      available: getAttribute('available'),
      name,
      params
    });

    if (results.length >= 30) break;
  }

  console.log('\nПРОВЕРКА ПОЛЕЙ АРТИКУЛА И КОДА\n');

  for (const item of results) {
    console.log('----------------------------------------');
    console.log('ID предложения:', item.id);
    console.log('ID группы:', item.group);
    console.log('Доступность:', item.available);
    console.log('Название:', item.name);
    console.log(
      'Поля с артикулом/кодом:',
      item.params.length ? item.params.join(' | ') : 'Отдельное поле не найдено'
    );
  }

  console.log('\nПРОВЕРКА ЗАВЕРШЕНА');
  console.log('Записей в базу данных не выполнялось.');
}

main().catch((error) => {
  console.error('ОШИБКА:', error.message);
});