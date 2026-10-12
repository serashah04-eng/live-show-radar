-- Record the confidence label an alert was sent with, so a later "now confirmed" upgrade notice can be sent once.
alter table public.notification_log add column if not exists label_at_send text;
