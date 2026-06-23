create or replace function public.delete_current_user(confirmation_email text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  token_issued_at bigint;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  token_issued_at := nullif(auth.jwt() ->> 'iat', '')::bigint;
  if token_issued_at is null or to_timestamp(token_issued_at) < now() - interval '10 minutes' then
    raise exception 'please sign in again before deleting your account' using errcode = '28000';
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  if current_email is null then
    raise exception 'account not found' using errcode = '22023';
  end if;

  if lower(btrim(coalesce(confirmation_email, ''))) <> lower(current_email) then
    raise exception 'confirmation email does not match' using errcode = '28000';
  end if;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user(text) from public;
grant execute on function public.delete_current_user(text) to authenticated;
