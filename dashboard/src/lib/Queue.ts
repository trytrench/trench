type AsyncTask = () => Promise<any>;

export class AsyncQueue {
  private queue: AsyncTask[] = [];
  private isProcessing: boolean = false;

  // Add a new task to the queue
  enqueue(task: AsyncTask): void {
    this.queue.push(task);
    this.processQueue();
  }

  // Process tasks in the queue one at a time
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    try {
      this.isProcessing = true;

      // Retrieve and execute the first task in the queue
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    } catch (error) {
      console.error("An error occurred while processing the queue:", error);
    } finally {
      this.isProcessing = false;

      // If there are more tasks, continue processing
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
}
