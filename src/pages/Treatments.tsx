import { useState } from 'react';
import { Search, Plus, Clock, Stethoscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { useTreatments, type TreatmentWithPractitioners } from '@/hooks/useTreatments';
import { NewTreatmentDialog } from '@/components/dialogs/NewTreatmentDialog';
import { EditTreatmentDialog } from '@/components/dialogs/EditTreatmentDialog';

export default function Treatments() {
  const { treatments, loading } = useTreatments();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<TreatmentWithPractitioners | null>(null);

  const filtered = treatments.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Tratamientos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los tipos de tratamiento y vinculalos a profesionales
          </p>
        </div>
        <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']}>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Tratamiento
          </Button>
        </RoleGuard>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tratamiento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {search ? 'No se encontraron tratamientos' : 'Sin tratamientos configurados'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Probá con otro término de búsqueda' : 'Creá un tratamiento para empezar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEditTarget(t)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {t.color && (
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  )}
                  <h3 className="font-semibold text-base truncate">{t.name}</h3>
                  {!t.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t.default_duration_minutes} min
                </div>

                {/* Practitioner chips */}
                <div className="flex flex-wrap gap-1">
                  {t.practitioners.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Todos los profesionales</span>
                  ) : (
                    t.practitioners.map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#3b82f6' }} />
                        {p.display_name}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NewTreatmentDialog open={showNew} onOpenChange={setShowNew} />
      <EditTreatmentDialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)} treatment={editTarget} />
    </div>
  );
}
