-- Function to automatically mark past scheduled appointments as no_show
CREATE OR REPLACE FUNCTION public.auto_mark_no_show()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments
  SET 
    status = 'no_show',
    updated_at = now()
  WHERE 
    status = 'scheduled'
    AND date < CURRENT_DATE;
    
  RAISE NOTICE 'auto_mark_no_show executed successfully';
END;
$$;