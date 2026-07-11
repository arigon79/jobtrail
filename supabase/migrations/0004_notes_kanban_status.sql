-- Turn free-floating notes into Kanban cards: each note now lives in a column.
alter table notes add column if not exists status text not null default 'todo'
  check (status in ('todo','doing','done'));
