/**
 * Schedule — Fluent Cron Expression Builder
 *
 * Provides a Laravel-inspired fluent API for building scheduled task
 * configurations with human-readable method chaining.
 *
 * @example
 * ```typescript
 * Schedule.task('cleanup')
 *   .description('Remove expired sessions')
 *   .daily()
 *   .at('03:00')
 *   .timezone('America/New_York')
 *   .withoutOverlapping()
 *   .onFailure((err) => console.error('Cleanup failed:', err))
 *   .do(async () => {
 *     await sessionService.removeExpired();
 *   });
 * ```
 */

import type { ScheduledTaskConfig } from './scheduler.types';

// ─── Cron Parts ─────────────────────────────────────────────────────────────

type CronParts = {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
};

function buildCron(parts: CronParts): string {
  return `${parts.minute} ${parts.hour} ${parts.dayOfMonth} ${parts.month} ${parts.dayOfWeek}`;
}

function parseTime(time: string): { hour: number; minute: number } {
  const parts = time.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parts.length > 1 ? parseInt(parts[1], 10) : 0;

  if (isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error(`Invalid hour in time "${time}": must be 0-23`);
  }
  if (isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error(`Invalid minute in time "${time}": must be 0-59`);
  }

  return { hour, minute };
}

// ─── Schedule Builder ───────────────────────────────────────────────────────

export class Schedule {
  private _parts: CronParts = {
    minute: '*',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  private _name = '';
  private _description?: string;
  private _timezone?: string;
  private _withoutOverlapping = false;
  private _onSuccess?: (durationMs: number) => void | Promise<void>;
  private _onFailure?: (error: Error) => void | Promise<void>;

  /**
   * Create a new schedule builder for a named task.
   */
  static task(name: string): Schedule {
    return new Schedule().name(name);
  }

  /**
   * Set the task name.
   */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set a human-readable description for the task.
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  // ── Frequency Methods ───────────────────────────────────────────────────

  /** Run every minute: `* * * * *` */
  everyMinute(): this {
    this._parts = { minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  // Run every 5 minutes: */5 * * * *
  everyFiveMinutes(): this {
    this._parts = { minute: '*/5', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  // Run every 10 minutes: */10 * * * *
  everyTenMinutes(): this {
    this._parts = { minute: '*/10', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  // Run every 15 minutes: */15 * * * *
  everyFifteenMinutes(): this {
    this._parts = { minute: '*/15', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  // Run every 30 minutes: */30 * * * *
  everyThirtyMinutes(): this {
    this._parts = { minute: '*/30', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per hour at minute 0: `0 * * * *` */
  hourly(): this {
    this._parts = { minute: '0', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per hour at the given minute: `{minute} * * * *` */
  hourlyAt(minute: number): this {
    if (minute < 0 || minute > 59) {
      throw new Error(`Invalid minute: ${minute}. Must be 0-59.`);
    }
    this._parts = { minute: String(minute), hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per day at midnight: `0 0 * * *` */
  daily(): this {
    this._parts = { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per day at the given time: e.g. `dailyAt('14:30')` -> `30 14 * * *` */
  dailyAt(time: string): this {
    const { hour, minute } = parseTime(time);
    this._parts = { minute: String(minute), hour: String(hour), dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run twice daily at the given hours (at minute 0): e.g. `twiceDaily(1, 13)` -> `0 1,13 * * *` */
  twiceDaily(first: number, second: number): this {
    this._parts = { minute: '0', hour: `${first},${second}`, dayOfMonth: '*', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per week on Sunday at midnight: `0 0 * * 0` */
  weekly(): this {
    this._parts = { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '0' };
    return this;
  }

  /** Run once per week on the given day (0=Sun, 6=Sat) at optional time */
  weeklyOn(day: number, time?: string): this {
    if (day < 0 || day > 6) {
      throw new Error(`Invalid day of week: ${day}. Must be 0-6 (Sun-Sat).`);
    }
    let hour = '0';
    let minute = '0';
    if (time) {
      const parsed = parseTime(time);
      hour = String(parsed.hour);
      minute = String(parsed.minute);
    }
    this._parts = { minute, hour, dayOfMonth: '*', month: '*', dayOfWeek: String(day) };
    return this;
  }

  /** Run once per month on the 1st at midnight: `0 0 1 * *` */
  monthly(): this {
    this._parts = { minute: '0', hour: '0', dayOfMonth: '1', month: '*', dayOfWeek: '*' };
    return this;
  }

  /** Run once per month on the given day at optional time */
  monthlyOn(day: number, time?: string): this {
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day of month: ${day}. Must be 1-31.`);
    }
    let hour = '0';
    let minute = '0';
    if (time) {
      const parsed = parseTime(time);
      hour = String(parsed.hour);
      minute = String(parsed.minute);
    }
    this._parts = { minute, hour, dayOfMonth: String(day), month: '*', dayOfWeek: '*' };
    return this;
  }

  // Run quarterly (1st day of Jan, Apr, Jul, Oct at midnight): 0 0 1 */3 *
  quarterly(): this {
    this._parts = { minute: '0', hour: '0', dayOfMonth: '1', month: '*/3', dayOfWeek: '*' };
    return this;
  }

  /** Run yearly on January 1st at midnight: `0 0 1 1 *` */
  yearly(): this {
    this._parts = { minute: '0', hour: '0', dayOfMonth: '1', month: '1', dayOfWeek: '*' };
    return this;
  }

  /** Set a raw cron expression directly */
  cron(expression: string): this {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression "${expression}": must have exactly 5 fields.`);
    }
    this._parts = {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
    return this;
  }

  /** Set the time component (HH:MM) on the current schedule. Works with daily/weekly/monthly. */
  at(time: string): this {
    const { hour, minute } = parseTime(time);
    this._parts.hour = String(hour);
    this._parts.minute = String(minute);
    return this;
  }

  // ── Options ─────────────────────────────────────────────────────────────

  /** Set the timezone for schedule evaluation */
  timezone(tz: string): this {
    this._timezone = tz;
    return this;
  }

  /** Prevent overlapping: only one instance of this task runs at a time */
  withoutOverlapping(): this {
    this._withoutOverlapping = true;
    return this;
  }

  /** Callback invoked when the task completes successfully */
  onSuccess(fn: (durationMs: number) => void | Promise<void>): this {
    this._onSuccess = fn;
    return this;
  }

  /** Callback invoked when the task throws an error */
  onFailure(fn: (error: Error) => void | Promise<void>): this {
    this._onFailure = fn;
    return this;
  }

  // ── Finalize ────────────────────────────────────────────────────────────

  /**
   * Attach the handler and produce the final task configuration.
   * This is the terminal method of the fluent chain.
   */
  do(handler: () => Promise<void>): ScheduledTaskConfig {
    if (!this._name) {
      throw new Error('Schedule.task() requires a name. Call .name() or use Schedule.task(name).');
    }

    return {
      name: this._name,
      description: this._description,
      cron: this.getCron(),
      handler,
      timezone: this._timezone,
      withoutOverlapping: this._withoutOverlapping,
      onSuccess: this._onSuccess,
      onFailure: this._onFailure,
    };
  }

  /**
   * Get the built cron expression.
   */
  getCron(): string {
    return buildCron(this._parts);
  }

  /**
   * Get the partial config (without handler).
   */
  getConfig(): Partial<ScheduledTaskConfig> {
    return {
      name: this._name || undefined,
      description: this._description,
      cron: this.getCron(),
      timezone: this._timezone,
      withoutOverlapping: this._withoutOverlapping,
      onSuccess: this._onSuccess,
      onFailure: this._onFailure,
    };
  }
}
