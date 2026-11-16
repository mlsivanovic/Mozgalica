-- pg_cron upisuje red u cron.job_run_details za svako pokretanje. Poslovi koji idu
-- svakog minuta za četiri meseca su napunili ~213 MB od 500 MB besplatnog paketa,
-- pa dnevnik čuvamo samo sedam dana.

delete from cron.job_run_details
where end_time < now() - interval '7 days';

select cron.schedule(
  'ciscenje_cron_dnevnika',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
