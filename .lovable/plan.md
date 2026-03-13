

# Ampliar permisos de documentos para recepcionistas y profesionales

## Resumen
Dar acceso de **ver y subir** documentos a `receptionist` y `health_pro`. Mantener **eliminar** solo para `admin_clinic` / `tenant_owner` / `super_admin`.

## Cambios

### 1. Base de datos — RLS en `patient_documents` (migración)

Agregar política INSERT para recepcionistas y health_pro:

```sql
-- Receptionist can upload documents
CREATE POLICY "documents_recep_insert"
ON public.patient_documents FOR INSERT
WITH CHECK (is_receptionist(clinic_id));

-- Health pro can upload documents for assigned patients
CREATE POLICY "documents_pro_insert_assigned"
ON public.patient_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = patient_documents.patient_id
      AND a.practitioner_id = current_practitioner_id()
  )
);
```

### 2. Storage — Agregar `health_pro` a la política INSERT de storage

```sql
DROP POLICY "Staff can upload patient documents" ON storage.objects;

CREATE POLICY "Staff can upload patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (
    is_admin_clinic((storage.foldername(name))[1]::uuid)
    OR is_receptionist((storage.foldername(name))[1]::uuid)
    OR is_health_pro((storage.foldername(name))[1]::uuid)
  )
);
```

### 3. Frontend — `src/pages/PatientDetailTabs.tsx`

- **Botón "Subir Documento"** (línea 775): Visible para todos los roles (ya lo está, RLS protege).
- **Botón "Eliminar"** (líneas 853-865): Envolver con `RoleGuard` para que solo `admin_clinic` y `tenant_owner` lo vean.

```tsx
<RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
  <Button variant="ghost" size="sm" ...>
    <Trash2 className="h-4 w-4" />
  </Button>
</RoleGuard>
```

### 4. Sin cambios en
- Hook `usePatientDocuments` — ya funciona correctamente.
- Componente `PatientUploadDocumentDialog` — sin cambios necesarios.

