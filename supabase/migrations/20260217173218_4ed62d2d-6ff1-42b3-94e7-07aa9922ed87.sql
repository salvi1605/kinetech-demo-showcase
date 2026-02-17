
-- Agregar columnas estructuradas de nombre
ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_surname text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS second_surname text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS second_name text;

-- Parsear nombres existentes desde full_name
UPDATE patients
SET
  first_surname  = split_part(full_name, ' ', 1),
  second_surname = CASE WHEN array_length(string_to_array(full_name, ' '), 1) >= 4
                        THEN split_part(full_name, ' ', 2) ELSE NULL END,
  first_name     = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) >= 4 THEN split_part(full_name, ' ', 3)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 3 THEN split_part(full_name, ' ', 2)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 2 THEN split_part(full_name, ' ', 2)
    ELSE NULL END,
  second_name    = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) >= 4 THEN split_part(full_name, ' ', 4)
    WHEN array_length(string_to_array(full_name, ' '), 1) = 3 THEN split_part(full_name, ' ', 3)
    ELSE NULL END
WHERE first_surname IS NULL;
