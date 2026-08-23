const freezeDefaults = (defaults) => Object.freeze(defaults);

export const TEMPLATES = Object.freeze([
  Object.freeze({
    id: "clean",
    name: "Clean",
    label: "MESSAGE FROM",
    stylesheet: "./templates/clean/clean.css",
    preview: "./templates/clean/preview.png",
    previewColors: ["#ffffff", "#181d26"],
    defaults: freezeDefaults({ nameFontSize: 32, contentFontSize: 18, contentHeight: 360, contentLineHeight: 1.75 })
  }),
  Object.freeze({
    id: "paper",
    name: "Paper",
    label: "LETTER FROM",
    stylesheet: "./templates/paper/paper.css",
    preview: "./templates/paper/preview.png",
    previewColors: ["#f7f0df", "#604d38"],
    defaults: freezeDefaults({ nameFontSize: 30, contentFontSize: 18, contentHeight: 390, contentLineHeight: 1.9 })
  }),
  Object.freeze({
    id: "pop",
    name: "Pop",
    label: "HELLO FROM",
    stylesheet: "./templates/pop/pop.css",
    preview: "./templates/pop/preview.png",
    previewColors: ["#fff7c7", "#ff5d73"],
    defaults: freezeDefaults({ nameFontSize: 36, contentFontSize: 20, contentHeight: 350, contentLineHeight: 1.7 })
  }),
  Object.freeze({
    id: "radio",
    name: "Radio",
    label: "ON AIR MESSAGE",
    stylesheet: "./templates/radio/radio.css",
    preview: "./templates/radio/preview.png",
    previewColors: ["#f3efe7", "#264653"],
    defaults: freezeDefaults({ nameFontSize: 28, contentFontSize: 21, contentHeight: 380, contentLineHeight: 1.8 })
  })
]);

export const FONT_LIMITS = Object.freeze({
  name: Object.freeze({ min: 16, max: 64, step: 1 }),
  content: Object.freeze({ min: 12, max: 40, step: 1 })
});

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
}
