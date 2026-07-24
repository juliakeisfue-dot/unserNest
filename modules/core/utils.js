// /mnt/kimi/upload/utils.js
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatPrice = (price) => {
  if (!price) return '';
  const num = parseFloat(price.toString().replace(',', '.'));
  return isNaN(num) ? '' : num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const parseBillDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Verschiedene Datumsformate versuchen
  const formats = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
    /(\d{1,2})\.(\d{1,2})\.(\d{2})/,  // DD.MM.YY
    /(\d{4})-(\d{2})-(\d{2})/         // YYYY-MM-DD
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      const [, a, b, c] = match;
      let year = parseInt(c);

      if (fmt === formats[2]) {
        return `${a}-${b}-${c}`;
      }

      if (year < 100) {
        year = year < 30 ? 2000 + year : 1900 + year;
      }

      const month = parseInt(b);
      const day = parseInt(a);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return new Date().toISOString().split('T')[0];
};

export const loadTesseract = async () => {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract.js konnte nicht geladen werden'));
      }
    };
    script.onerror = () => {
      reject(new Error('Tesseract.js-Script konnte nicht geladen werden'));
    };
    document.head.appendChild(script);
  });
};
