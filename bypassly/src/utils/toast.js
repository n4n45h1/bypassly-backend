// Lightweight module-level toast bus — no React context needed
let _handler = null;

export const toast = {
  /** @param {string} message @param {'success'|'error'|'info'} type */
  show(message, type = 'success') {
    _handler?.(message, type);
  },
  success(message) { this.show(message, 'success'); },
  error(message)   { this.show(message, 'error');   },
  info(message)    { this.show(message, 'info');    },
  _register(fn)    { _handler = fn; },
};
