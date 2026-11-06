/**
 * jsdom has no IntersectionObserver. This stub records every observer, so a test can say when an
 * element enters or leaves the viewport: `intersect(element, true)`.
 */
type Observer = {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  instance: IntersectionObserver;
};

const observers = new Set<Observer>();

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  readonly scrollMargin = '0px';
  private readonly entry: Observer;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = [options.threshold ?? 0].flat();
    this.entry = { callback, elements: new Set(), instance: this };
    observers.add(this.entry);
  }

  observe(element: Element) {
    this.entry.elements.add(element);
  }

  unobserve(element: Element) {
    this.entry.elements.delete(element);
  }

  disconnect() {
    this.entry.elements.clear();
    observers.delete(this.entry);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

export function installIntersectionObserver(): void {
  observers.clear();
  window.IntersectionObserver = IntersectionObserverStub;
}

/** Tells every observer of `element` that it is (or is no longer) in view. */
export function intersect(
  element: Element,
  isIntersecting: boolean,
  top = isIntersecting ? 0 : 10_000,
): void {
  const rect = { top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: top };
  for (const observer of [...observers]) {
    if (!observer.elements.has(element)) continue;
    const entry = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: { ...rect, toJSON: () => rect },
      intersectionRect: { ...rect, toJSON: () => rect },
      rootBounds: null,
      time: 0,
    } as IntersectionObserverEntry;
    observer.callback([entry], observer.instance);
  }
}

/** How many elements are observed right now (to check that observers are disconnected). */
export function observedCount(): number {
  let count = 0;
  for (const observer of observers) count += observer.elements.size;
  return count;
}
