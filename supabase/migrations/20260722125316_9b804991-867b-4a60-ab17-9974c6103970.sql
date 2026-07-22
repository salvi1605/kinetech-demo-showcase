-- Reforzar integridad de datos críticos en public.patients
-- Datos verificados previamente: 0 nulos en document_id, date_of_birth y phone.

ALTER TABLE public.patients
  ALTER COLUMN document_id SET NOT NULL,
  ALTER COLUMN date_of_birth SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_document_id_not_blank
    CHECK (length(btrim(document_id)) > 0);

ALTER TABLE public.patients
  ADD CONSTRAINT patients_phone_not_blank
    CHECK (length(btrim(phone)) > 0);

ALTER TABLE public.patients
  ADD CONSTRAINT patients_date_of_birth_not_future
    CHECK (date_of_birth <= CURRENT_DATE);
