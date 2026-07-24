select cron.schedule(
  'dispatch_notification_deliveries_retry',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'notification_dispatch_project_url'
      ) || '/functions/v1/dispatch-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'notification_dispatch_service_role_key'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $cron$
);
