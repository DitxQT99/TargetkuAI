CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_id ON push_subscriptions(device_id);

CREATE TABLE IF NOT EXISTS reminders (
  device_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('daily','weekdays','weekly','custom')),
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_every INTEGER NOT NULL DEFAULT 1 CHECK (custom_every BETWEEN 1 AND 30),
  custom_unit TEXT NOT NULL DEFAULT 'days' CHECK (custom_unit IN ('days','weeks')),
  target_time CHAR(5) NOT NULL CHECK (target_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  reminder_offset TEXT NOT NULL CHECK (reminder_offset IN ('off','atTime','10m','30m')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  target_created_at_ms BIGINT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  lock_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(next_run_at) WHERE active=TRUE;
CREATE INDEX IF NOT EXISTS idx_reminders_lock ON reminders(lock_until);
CREATE INDEX IF NOT EXISTS idx_reminders_device ON reminders(device_id);
