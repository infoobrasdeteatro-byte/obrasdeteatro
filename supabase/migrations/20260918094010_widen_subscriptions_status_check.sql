ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active', 'canceled', 'past_due', 'trialing',
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  ));
