-- knowledge_items.technique was restricted to the original four techniques in
-- 002, but lib/types.ts has since grown to 27. The documentation agent's default
-- technique list includes UHPLC, so persisting a UHPLC item raised a
-- check_violation and the whole batch insert failed.
--
-- Widen the constraint to match the Technique union in lib/types.ts.

alter table knowledge_items
  drop constraint if exists knowledge_items_technique_check;

-- Drop any differently-named check constraint on the same column.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any (con.conkey)
    where rel.relname = 'knowledge_items'
      and con.contype = 'c'
      and att.attname = 'technique'
  loop
    execute format('alter table knowledge_items drop constraint %I', c.conname);
  end loop;
end $$;

alter table knowledge_items
  add constraint knowledge_items_technique_check
  check (technique in (
    'LCMS','HPLC','GC','GCMS','UHPLC','IC','CE','SFC','TGA','DSC','FPLC',
    'SPPS','XRD','DLS','Titration','KF','KFO','CD','SEM','Sputter','BET',
    'SECMALS','TEM','Raman','ssNMR','NMR','PrepLC'
  ));
