
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

  const allParamNames = new Set();
  const allTagNames = new Set();
  const examples = new Map();

  const offerRegex = /<offer\b([^>]*)>([\s\S]*?)<\/offer>/gi;
  let offerCount = 0;
  let match;

  while ((match = offerRegex.exec(xml)) !== null) {
    offerCount++;

    const attributes = match[1];
    const body = match[2];

    for (const tag of body.matchAll(/<([a-zA-Z_][\w:.-]*)\b/g)) {
      allTagNames.add(tag[1]);
    }
for (const tagName of ['sku', 'vendorCode']) {
  const tagMatch = body.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  );

  if (!tagMatch) continue;

  const value = tagMatch[1].replace(/<[^>]*>/g, '').trim();
  if (!value) continue;

  if (!examples.has(`TAG:${tagName}`)) {
    examples.set(`TAG:${tagName}`, new Set());
  }

  const values = examples.get(`TAG:${tagName}`);
  if (values.size < 5) values.add(value);
}
    for (const p of body.matchAll(
      /<param\b([^>]*)>([\s\S]*?)<\/param>/gi
    )) {
      const nameMatch = p[1].match(/\bname\s*=\s*['"]([^'"]+)['"]/i);
      if (!nameMatch) continue;

      const name = nameMatch[1].trim();
      const value = p[2].replace(/<[^>]*>/g, '').trim();

      allParamNames.add(name);

      if (!examples.has(name)) examples.set(name, new Set());

      const values = examples.get(name);
      if (value && values.size < 5) values.add(value);
    }

    if (offerCount <= 5) {
      const id = attributes.match(/\bid\s*=\s*['"]([^'"]+)['"]/i);
      const group = attributes.match(/\bgroup_id\s*=\s*['"]([^'"]+)['"]/i);
      const available = attributes.match(/\bavailable\s*=\s*['"]([^'"]+)['"]/i);
      const quantity = body.match(
        /<quantity_in_stock\b[^>]*>([\s\S]*?)<\/quantity_in_stock>/i
      );
      const name = body.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i);

      console.log('\n--- Пример предложения', offerCount, '---');
      console.log('ID:', id?.[1] || '(не найден)');
      console.log('Group ID:', group?.[1] || '(не найден)');
      console.log('Доступность:', available?.[1] || '(не найдена)');
      console.log('Название:', name?.[1]?.replace(/<[^>]*>/g, '').trim() || '(не найдено)');
      console.log('Остаток:', quantity?.[1]?.trim() || '(не найден)');
    }
  }

  console.log('\nВсего предложений:', offerCount);

  console.log('\n=== ВСЕ НАЗВАНИЯ XML-ТЕГОВ ===');
  console.log([...allTagNames].sort().join('\n'));

  console.log('\n=== ВСЕ НАЗВАНИЯ ПАРАМЕТРОВ ===');
  console.log([...allParamNames].sort().join('\n'));

  console.log('\n=== ПОЛЯ, ПОХОЖИЕ НА АРТИКУЛ ИЛИ КОД ===');

  const relevantNames = [...new Set([...allTagNames, ...allParamNames])]
    .filter(name =>
      /артикул|код|sku|article|vendor|product.?id|ідентифікатор/i.test(name)
    )
    .sort();

  console.log(relevantNames.join('\n') || 'Совпадений по названиям не найдено');

  console.log('\n=== ПРИМЕРЫ ЗНАЧЕНИЙ ПОДОЗРИТЕЛЬНЫХ ПАРАМЕТРОВ ===');

  for (const name of relevantNames) {
    if (!examples.has(name)) continue;
    console.log(`${name}: ${[...examples.get(name)].join(' | ')}`);
  }

  console.log('\nПроверка завершена. База данных не изменялась.');
}

main().catch(error => {
  console.error('ОШИБКА:', error.message);
  process.exitCode = 1;
});
