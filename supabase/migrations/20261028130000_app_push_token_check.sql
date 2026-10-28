-- 20261028120000_app_push.sql checked app tokens with a regex repeat count
-- of 4096, past Postgres's limit of 255, so every save failed ("invalid
-- repetition count"). Same rule, with the length checked on its own.

alter table public.push_subscriptions
  drop constraint push_subscriptions_address_check,
  add constraint push_subscriptions_address_check check (
    case kind
      when 'web' then endpoint like 'https://%' and length(endpoint) <= 1000 and p256dh is not null and auth is not null
      else endpoint ~ '^[A-Za-z0-9:_-]+$' and length(endpoint) <= 4096 and p256dh is null and auth is null
    end
  );
