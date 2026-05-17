import { describe, expect, it } from 'vitest';
import { cancelBackgroundTask, runBackgroundTask, type TaskProgressEvent } from '../src/main/services/backgroundTaskRunner';

describe('background task runner', () => {
  it('emits progress, supports cooperative cancel, and cleans up task controllers', async () => {
    const events: TaskProgressEvent[] = [];
    let taskStarted = false;
    const task = runBackgroundTask('task_cancel_test', 'data.backup', (event) => {
      events.push(event);
      if (event.type === 'task.started') {
        taskStarted = true;
      }
    }, async (context) => {
      await context.checkpoint(0.25, 'chunk 1');
      const canceled = cancelBackgroundTask(context.taskId);
      expect(canceled).toEqual({ taskId: context.taskId, canceled: true });
      await context.checkpoint(0.5, 'chunk 2');
      return 'unreachable';
    });

    await expect(task).rejects.toThrow(/Task canceled/);
    expect(taskStarted).toBe(true);
    expect(events.map((event) => event.type)).toEqual(['task.started', 'task.progress', 'task.progress', 'task.canceled']);
    expect(events.every((event) => event.taskId === 'task_cancel_test' && event.phase && typeof event.timestamp === 'number')).toBe(true);
    expect(cancelBackgroundTask('task_cancel_test')).toEqual({ taskId: 'task_cancel_test', canceled: false });
  });
});
