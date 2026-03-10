
-- Unique partial index: prevents two active (non-cancelled) appointments
-- on the same clinic + date + start_time + sub_slot.
-- States that BLOCK the slot: scheduled, confirmed, completed, no_show.
-- Only 'cancelled' frees the slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_slot
  ON public.appointments (clinic_id, date, start_time, sub_slot)
  WHERE (status <> 'cancelled');
