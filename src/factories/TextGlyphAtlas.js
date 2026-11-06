import {
  TEXT_GLYPHS,
  layoutWord,
  splitCommentIntoWords,
  sanitizeText,
  TextGlyphAtlas as EngineAtlas
} from '@shell-drone/firework-engine';

export const TextGlyphAtlas = EngineAtlas || {
  TEXT_GLYPHS,
  layoutWord,
  splitCommentIntoWords,
  sanitizeText
};

export {
  TEXT_GLYPHS,
  layoutWord,
  splitCommentIntoWords,
  sanitizeText
};

export default TextGlyphAtlas;
