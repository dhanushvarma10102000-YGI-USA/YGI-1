create table if not exists universities (
  id bigint generated always as identity primary key,
  name text not null,
  city text,
  state text,
  latitude double precision not null,
  longitude double precision not null,
  campus_radius integer default 1000
);

create index if not exists universities_name_idx on universities (name);
create index if not exists universities_city_state_idx on universities (city, state);
create unique index if not exists universities_name_unique_idx on universities (lower(name));

insert into universities (name, city, state, latitude, longitude, campus_radius)
values
  ('Grand Canyon University', 'Phoenix', 'Arizona', 33.5123, -112.1299, 1000),
  ('Arizona State University', 'Tempe', 'Arizona', 33.4242, -111.9281, 1200),
  ('UCLA', 'Los Angeles', 'California', 34.0689, -118.4452, 1100)
on conflict do nothing;
