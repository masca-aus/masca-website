/** One writer for autosave and explicit actions. Read form values inside each task. */
export function createEventSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(task, task);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
