Object.defineProperty(window, 'now', {
  get() {
    return (new Date()).getTime();
  },
});

Object.defineProperty(window, 'lastFrameTime', {
  get() {
    return window._lastFrameTime || window.now;
  },
  set(value) {
    this._lastFrameTime = value;
  },
});
