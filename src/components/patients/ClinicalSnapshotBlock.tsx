import { Stethoscope, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import type { ClinicalSummaryDay } from '@/contexts/AppContext';

interface ClinicalSnapshotBlockProps {
  date: string;
  snapshot: ClinicalSummaryDay;
  isToday: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const ClinicalSnapshotBlock = ({
  date,
  snapshot,
  isToday,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ClinicalSnapshotBlockProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Mapeo de nombres técnicos a nombres legibles
  const redFlagsLabels: Record<string, string> = {
    embarazo: 'Embarazo',
    cancer: 'Cáncer',
    marcapasos: 'Marcapasos',
    alergias: 'Alergias',
  };

  const restriccionesLabels: Record<string, string> = {
    noMagnetoterapia: 'No Magnetoterapia',
    noElectroterapia: 'No Electroterapia',
  };

  // Formatear Banderas Rojas con detalle de alergias
  const formatBanderasRojas = (): string => {
    if (!snapshot.clinicalData.redFlags) return '—';

    const flags = Object.entries(snapshot.clinicalData.redFlags)
      .filter(([_, value]) => value)
      .map(([key]) => {
        // Si es alergias y hay detalle, mostrar el detalle
        if (key === 'alergias' && snapshot.clinicalData.redFlagsDetail?.alergias) {
          return `Alergias: ${snapshot.clinicalData.redFlagsDetail.alergias}`;
        }
        return redFlagsLabels[key] || key;
      });

    return flags.length > 0 ? flags.join(' • ') : '—';
  };

  // Formatear Restricciones
  const formatRestricciones = (): string => {
    if (!snapshot.clinicalData.restricciones) return '—';

    const restricciones = Object.entries(snapshot.clinicalData.restricciones)
      .filter(([_, value]) => value)
      .map(([key]) => restriccionesLabels[key] || key);

    return restricciones.length > 0 ? restricciones.join(' • ') : '—';
  };

  const banderasRojas = formatBanderasRojas();
  const restricciones = formatRestricciones();

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="mb-4 border bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">
            Resumen Clínico del {formatDate(date)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                aria-label="Editar clínico del día"
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Clínico
              </Button>
            )}
            {canDelete && !isToday && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Opciones">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    Eliminar Resumen del día
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Diagnóstico</p>
              <p className="font-medium">{snapshot.clinicalData.diagnosis || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Lateralidad</p>
              <p className="font-medium">{snapshot.clinicalData.laterality || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Nivel de Dolor (0–10)</p>
              <p className="font-medium">
                {snapshot.clinicalData.painLevel !== undefined
                  ? `${snapshot.clinicalData.painLevel}/10`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Motivo Principal</p>
              <p className="font-medium">{snapshot.clinicalData.mainReason || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Banderas Rojas</p>
              <p className="font-medium text-xs">{banderasRojas}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Restricciones</p>
              <p className="font-medium text-xs">{restricciones}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar resumen del día?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El resumen clínico del {formatDate(date)}{' '}
              será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
