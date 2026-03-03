import { useProductivityReport } from '@/hooks/useReportData';
import { exportToCSV } from '@/utils/reportExport';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Props {
  dateFrom: string;
  dateTo: string;
}

export default function ProductivityReport({ dateFrom, dateTo }: Props) {
  const { data, isLoading } = useProductivityReport({ dateFrom, dateTo });

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV('reporte-productividad',
      ['Profesional', 'Atendidos', 'No-Shows', '% No-Show', 'Prom/Día', 'Hs Efectivas', 'Hs Disponibles'],
      data.map(p => [p.name, p.attended, p.noShows, p.noShowPct, p.avgPerDay, p.effectiveHours, p.availableHours])
    );
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No hay datos para el rango seleccionado.</p>;
  }

  return (
    <div className="report-printable space-y-6">
      {/* Bar Chart */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold mb-4 text-foreground">Pacientes Atendidos por Profesional</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
          <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={90} className="text-xs" />
            <Tooltip />
            <Legend />
            <Bar dataKey="attended" name="Atendidos" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
            <Bar dataKey="noShows" name="No-Shows" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b no-print">
          <h3 className="font-semibold text-foreground">Detalle</h3>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesional</TableHead>
              <TableHead className="text-right">Atendidos</TableHead>
              <TableHead className="text-right">No-Shows</TableHead>
              <TableHead className="text-right">% No-Show</TableHead>
              <TableHead className="text-right">Prom/Día</TableHead>
              <TableHead className="text-right">Hs Efectivas</TableHead>
              <TableHead className="text-right">Hs Disponibles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">{p.attended}</TableCell>
                <TableCell className="text-right text-destructive">{p.noShows}</TableCell>
                <TableCell className="text-right">{p.noShowPct}%</TableCell>
                <TableCell className="text-right">{p.avgPerDay}</TableCell>
                <TableCell className="text-right">{p.effectiveHours}</TableCell>
                <TableCell className="text-right">{p.availableHours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
