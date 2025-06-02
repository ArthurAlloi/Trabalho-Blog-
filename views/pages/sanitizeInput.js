
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Função recursiva que limpa qualquer valor (string, objeto, array)
function deepSanitize(obj) {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = deepSanitize(obj[key]);
    }
    return sanitized;
  }
  return obj; // números, booleanos etc.
}

// Middleware para limpar req.body, req.query e req.params
function sanitizeInput(req, res, next) {
  req.body = deepSanitize(req.body);
  req.query = deepSanitize(req.query);
  req.params = deepSanitize(req.params);
  next();
}

module.exports = sanitizeInput;
