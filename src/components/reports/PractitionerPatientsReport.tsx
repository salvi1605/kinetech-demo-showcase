import { usePractitionerPatientsReport } from '@/hooks/useReportData';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Users } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Props {
  dateFrom: string;
  dateTo: string;
  practitionerId?: string;
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) {
    return <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full mr-2 shrink-0 bg-muted-foreground/40" />;
  }
  return <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: color }} />;
}

export default function PractitionerPatientsReport({ dateFrom, dateTo, practitionerId }: Props) {
  const { data, isLoading, isError } = usePractitionerPatientsReport({ dateFrom, dateTo, practitionerId });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (isError) {
    return <p role="alert" className="text-destructive text-center py-12">No se pudo cargar el reporte. Intenta de nuevo.</p>;
  }

  if (!data || data.totalAppointments === 0) {
    return <p className="text-muted-foreground text-center py-12">No hay datos para el rango seleccionado.</p>;
  }

  return (
    <div className="report-printable space-y-6">
      {/* Total del período */}
      <section aria-labelledby="pp-total-title" className="bg-card rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="pp-total-title" className="font-semibold text-foreground">
              Total pacientes distintos en el período: <span className="tabular-nums">{data.totalDistinctPatients}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Turnos completados: <span className="tabular-nums">{data.totalAppointments}</span>
            </p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Solo cuenta turnos completados. Un paciente que se atendió con varios profesionales o tratamientos aparece
            en cada fila que le corresponde, pero cuenta una sola vez en el total del período, así que el total puede ser
            menor que la suma de las filas.
          </span>
        </p>
      </section>

      {/* Una tarjeta por profesional */}
      {data.practitioners.map((group, gi) => {
        const titleId = `pp-practitioner-${gi}`;
        return (
          <section key={titleId} aria-labelledby={titleId} className="bg-card rounded-lg border min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border-b">
              <h3 id={titleId} className="font-semibold text-foreground flex items-center min-w-0">
                <ColorDot color={group.color} />
                <span className="truncate">{group.practitionerName}</span>
                {group.isInactive && (
                  <span className="ml-2 shrink-0 text-sm font-normal text-muted-foreground">(inactivo)</span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Pacientes distintos: <span className="font-medium text-foreground tabular-nums">{group.distinctPatients}</span>
                {' · '}
                Turnos: <span className="font-medium text-foreground tabular-nums">{group.appointments}</span>
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tratamiento</TableHead>
                  <TableHead className="text-right w-28 sm:w-40">Pacientes distintos</TableHead>
                  <TableHead className="text-right w-20 sm:w-32">Turnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((row, ri) => (
                  <TableRow key={`${titleId}-${ri}`}>
                    <TableCell className="font-medium">
                      <span className="flex items-center">
                        <ColorDot color={row.color} />
                        <span className={row.isUnclassified ? 'text-muted-foreground italic' : undefined}>{row.treatmentName}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.distinctPatients}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.appointments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        );
      })}
    </div>
  );
}
