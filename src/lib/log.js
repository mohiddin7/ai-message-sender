const PREFIX = "[ai-auto-sender]";
export const log = {
  info:  (tag, ...a) => console.info(PREFIX, tag, ...a),
  warn:  (tag, ...a) => console.warn(PREFIX, tag, ...a),
  error: (tag, ...a) => console.error(PREFIX, tag, ...a)
};