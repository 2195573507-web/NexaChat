import type { TaskCancelResult } from '../../shared/types.js';
import type { IpcEventPayloads } from '../../shared/ipc.js';
import { IPC_EVENT_CHANNELS } from '../../shared/ipc.js';

export type TaskProgressEvent = IpcEventPayloads[typeof IPC_EVENT_CHANNELS.taskProgress];
export type TaskEmitter = (payload: TaskProgressEvent) => void;

export interface BackgroundTaskContext {
  taskId: string;
  signal: AbortSignal;
  emit: TaskEmitter;
  checkpoint: (progress: number, message?: string) => Promise<void>;
}

type TaskKind = TaskProgressEvent['taskKind'];

const controllers = new Map<string, AbortController>();

export function cancelBackgroundTask(taskId: string): TaskCancelResult {
  const controller = controllers.get(taskId);
  if (!controller) {
    return { taskId, canceled: false };
  }
  controller.abort();
  controllers.delete(taskId);
  return { taskId, canceled: true };
}

export async function runBackgroundTask<T>(
  taskId: string,
  taskKind: TaskKind,
  emit: TaskEmitter,
  action: (context: BackgroundTaskContext) => T | Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  controllers.set(taskId, controller);
  const context: BackgroundTaskContext = {
    taskId,
    signal: controller.signal,
    emit,
    async checkpoint(progress, message) {
      if (controller.signal.aborted) {
        throw new Error('Task canceled');
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      emit({
        taskId,
        taskKind,
        type: 'task.progress',
        phase: 'processing',
        timestamp: Date.now(),
        progress,
        message,
      });
    },
  };
  emit({ taskId, taskKind, type: 'task.started', phase: 'started', timestamp: Date.now(), progress: 0 });
  try {
    await context.checkpoint(0.15, `${taskKind}: preparing`);
    const result = await action(context);
    if (controller.signal.aborted) {
      throw new Error('Task canceled');
    }
    emit({ taskId, taskKind, type: 'task.completed', phase: 'completed', timestamp: Date.now(), progress: 1 });
    return result;
  } catch (error) {
    const canceled = controller.signal.aborted || (error instanceof Error && /canceled/i.test(error.message));
    emit({
      taskId,
      taskKind,
      type: canceled ? 'task.canceled' : 'task.failed',
      phase: canceled ? 'canceled' : 'failed',
      timestamp: Date.now(),
      progress: 1,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    controllers.delete(taskId);
  }
}
