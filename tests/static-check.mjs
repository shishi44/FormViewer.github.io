globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
})();

const { TEMPLATES, getTemplateById } = await import('../js/config/templates.js');
const settings = await import('../js/services/settingsService.js');
const helpers = await import('../js/utils/helpers.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(TEMPLATES.length === 4, '4 templates are required');
assert(getTemplateById('radio').name === 'Radio', 'template lookup failed');
assert(getTemplateById('unknown').id === 'clean', 'unknown template must fallback to clean');
assert(helpers.clamp(100, 16, 64) === 64, 'upper clamp failed');
assert(helpers.clamp(1, 16, 64) === 16, 'lower clamp failed');

let state = settings.loadSettings();
state = settings.updateTemplateSettings(state, 'pop', { nameFontSize: 999, contentFontSize: 1 });
let pop = settings.getTemplateSettings(state, 'pop');
assert(pop.nameFontSize === 64, 'name size must clamp to 64');
assert(pop.contentFontSize === 12, 'content size must clamp to 12');
state = settings.resetTemplateSettings(state, 'pop');
pop = settings.getTemplateSettings(state, 'pop');
assert(pop.nameFontSize === 36 && pop.contentFontSize === 20, 'template reset failed');
settings.saveSelectedResponseId('response-10');
assert(settings.loadSelectedResponseId() === 'response-10', 'selected response persistence failed');

console.log('Node static behavior checks: OK');
