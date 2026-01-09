import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Database, Building2, Lock, Unlock } from "lucide-react";

export default function Architecture() {
  return (
    <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']} fallback={
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
        <p className="text-muted-foreground mt-2">Esta página solo está disponible para administradores.</p>
      </div>
    }>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Arquitectura del Sistema</h1>
          <p className="text-muted-foreground">Documentación interna de autenticación, RLS y modelo multi-tenant.</p>
        </div>

        {/* Auth Flow Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Auth Flow
            </CardTitle>
            <CardDescription>Flujo de autenticación y asignación de roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Registro (Sign Up)</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 rounded">supabase.auth.signUp()</code> crea usuario en <code className="bg-muted px-1 rounded">auth.users</code></li>
                <li>Trigger <code className="bg-muted px-1 rounded">sync_auth_user</code> vincula <code className="bg-muted px-1 rounded">auth_user_id</code> con <code className="bg-muted px-1 rounded">public.users</code> si existe email</li>
                <li>Edge function <code className="bg-muted px-1 rounded">create-user</code> crea registro en <code className="bg-muted px-1 rounded">public.users</code> + asigna rol en <code className="bg-muted px-1 rounded">user_roles</code></li>
                <li>Si es primer usuario → crea clínica + asigna <code className="bg-muted px-1 rounded">tenant_owner</code> + <code className="bg-muted px-1 rounded">admin_clinic</code></li>
                <li>Redirect a <code className="bg-muted px-1 rounded">/select-clinic</code> o <code className="bg-muted px-1 rounded">/create-clinic</code></li>
              </ol>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Login</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 rounded">supabase.auth.signInWithPassword()</code></li>
                <li><code className="bg-muted px-1 rounded">onAuthStateChange</code> detecta sesión activa</li>
                <li>Carga <code className="bg-muted px-1 rounded">public.users</code> + <code className="bg-muted px-1 rounded">user_roles</code> para obtener clínicas y roles</li>
                <li>Si 1 clínica → auto-select; Si múltiples → <code className="bg-muted px-1 rounded">/select-clinic</code></li>
                <li><code className="bg-muted px-1 rounded">AppContext</code> almacena <code className="bg-muted px-1 rounded">currentClinicId</code> + <code className="bg-muted px-1 rounded">userRole</code></li>
              </ol>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-2">Mermaid Diagram:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant Auth as Supabase Auth
    participant EF as Edge Function
    participant DB as Database

    U->>FE: Click "Registrarse"
    FE->>Auth: signUp(email, password)
    Auth-->>FE: Session + User
    FE->>EF: create-user(userData)
    EF->>DB: INSERT users + user_roles
    EF-->>FE: { userId, roles }
    FE->>FE: Check clinic count
    alt No clinics
        FE->>U: Redirect /create-clinic
    else 1+ clinics
        FE->>U: Redirect /select-clinic
    end`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* RLS Overview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              RLS Overview
            </CardTitle>
            <CardDescription>Políticas de Row Level Security por tabla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Security Definer Functions</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline"><code>is_tenant_owner()</code></Badge>
                <Badge variant="outline"><code>is_admin_clinic(clinic_id)</code></Badge>
                <Badge variant="outline"><code>is_receptionist(clinic_id)</code></Badge>
                <Badge variant="outline"><code>is_health_pro(clinic_id)</code></Badge>
                <Badge variant="outline"><code>current_practitioner_id()</code></Badge>
                <Badge variant="outline"><code>can_view_user(user_id)</code></Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  Client-Writable (via RLS)
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <code className="bg-muted px-1 rounded">appointments</code> - admin/recep ALL, pro UPDATE own</li>
                  <li>• <code className="bg-muted px-1 rounded">patients</code> - admin ALL, recep INSERT/UPDATE/SELECT</li>
                  <li>• <code className="bg-muted px-1 rounded">patient_clinical_notes</code> - admin ALL, pro INSERT/UPDATE assigned</li>
                  <li>• <code className="bg-muted px-1 rounded">practitioners</code> - admin ALL</li>
                  <li>• <code className="bg-muted px-1 rounded">practitioner_availability</code> - admin ALL, pro manage own</li>
                  <li>• <code className="bg-muted px-1 rounded">schedule_exceptions</code> - admin ALL, pro manage own</li>
                  <li>• <code className="bg-muted px-1 rounded">clinics</code> - admin/tenant_owner ALL</li>
                  <li>• <code className="bg-muted px-1 rounded">clinic_settings</code> - admin ALL</li>
                  <li>• <code className="bg-muted px-1 rounded">user_roles</code> - admin ALL</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-destructive" />
                  Edge-Only / Read-Only
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <code className="bg-muted px-1 rounded">users</code> - SELECT only, INSERT/UPDATE via edge function</li>
                  <li>• <code className="bg-muted px-1 rounded">audit_log</code> - SELECT admin, no client INSERT/UPDATE/DELETE</li>
                  <li>• <code className="bg-muted px-1 rounded">roles</code> - SELECT only (reference table)</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-2">Ejemplo RLS Policy:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`-- appointments_admin_full_access
CREATE POLICY "appointments_admin_full_access"
ON public.appointments
FOR ALL
USING (is_admin_clinic(clinic_id));

-- La función is_admin_clinic incluye tenant_owner:
CREATE FUNCTION is_admin_clinic(target_clinic_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.clinic_id = target_clinic_id
      AND ur.role_id IN ('admin_clinic', 'tenant_owner')
      AND ur.active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Multi-tenant Model Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Multi-tenant Model
            </CardTitle>
            <CardDescription>Modelo de aislamiento por clínica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">¿Quién es el Tenant?</h4>
              <p className="text-sm text-muted-foreground">
                <strong>La clínica es el tenant.</strong> No existe tabla <code className="bg-muted px-1 rounded">tenants</code> separada. 
                Cada <code className="bg-muted px-1 rounded">clinic</code> actúa como unidad de aislamiento de datos.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Discriminación por clinic_id</h4>
              <p className="text-sm text-muted-foreground">
                Todas las tablas principales tienen columna <code className="bg-muted px-1 rounded">clinic_id</code> (FK a <code className="bg-muted px-1 rounded">clinics.id</code>). 
                Las políticas RLS filtran datos usando este campo.
              </p>
              <div className="flex flex-wrap gap-2">
                {['appointments', 'patients', 'practitioners', 'patient_clinical_notes', 'schedule_exceptions', 'treatment_types', 'clinic_settings'].map(table => (
                  <Badge key={table} variant="secondary" className="font-mono text-xs">{table}.clinic_id</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Asignación Usuario ↔ Clínica</h4>
              <p className="text-sm text-muted-foreground">
                Tabla <code className="bg-muted px-1 rounded">user_roles</code> conecta usuarios con clínicas y roles. 
                Un usuario puede tener múltiples roles en múltiples clínicas.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-2">Mermaid ER Diagram:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`erDiagram
    clinics ||--o{ user_roles : "has"
    clinics ||--o{ appointments : "contains"
    clinics ||--o{ patients : "contains"
    clinics ||--o{ practitioners : "contains"
    clinics ||--|| clinic_settings : "has"
    
    users ||--o{ user_roles : "has"
    users ||--o| practitioners : "links to"
    
    user_roles {
        uuid id PK
        uuid user_id FK
        uuid clinic_id FK
        text role_id FK
        boolean active
    }
    
    roles ||--o{ user_roles : "defines"
    roles {
        text id PK "tenant_owner|admin_clinic|receptionist|health_pro"
    }`}
              </pre>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Flujo de Selección de Clínica</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`flowchart TD
    A[Usuario autenticado] --> B{¿Cuántas clínicas?}
    B -->|0| C[/create-clinic/]
    B -->|1| D[Auto-select + /calendar]
    B -->|2+| E[/select-clinic/]
    
    C --> F[Crear clínica]
    F --> G[Asignar tenant_owner + admin_clinic]
    G --> D
    
    E --> H[Usuario elige clínica]
    H --> I[AppContext.currentClinicId = selected]
    I --> D`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
