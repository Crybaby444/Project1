// jsdom has no AnimationEvent, so `animationName` would be lost on fireEvent.animationEnd.
// This must run before react-dom loads: React picks its animationend event name at import time.
if (typeof window.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    readonly pseudoElement: string;

    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  window.AnimationEvent = AnimationEventPolyfill as unknown as typeof AnimationEvent;
}

export {};
