import { useComplianceReport } from '@/hooks/useReportData';
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
import { Badge } from '@/components/ui/badge';

interface Props {
  dateFrom: string;
  dateTo: string;
}

export default function ComplianceReport({ dateFrom, dateTo }: Props) {
  const { data, isLoading } = useComplianceReport({ dateFrom, dateTo });

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV('reporte-cumplimiento',
      ['Profesional', 'Citas Completadas', 'Evoluciones Completadas', '% Cumplimiento'],
      data.map(p => [p.name, p.completedAppts, p.completedNotes, p.compliancePct])
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
        <h3 className="font-semibold mb-4 text-foreground">Ranking de Cumplimiento de Historias Clínicas</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 60)}>
          <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="name" width={90} className="text-xs" />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Bar dataKey="compliancePct" name="% Cumplimiento" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.compliancePct >= 80 ? 'hsl(var(--primary))' : entry.compliancePct >= 50 ? '#f59e0b' : 'hsl(var(--destructive))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b no-print">
          <h3 className="font-semibold text-foreground">Detalle por Profesional</h3>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesional</TableHead>
              <TableHead className="text-right">Citas Completadas</TableHead>
              <TableHead className="text-right">Evoluciones</TableHead>
              <TableHead className="text-right">Cumplimiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">{p.completedAppts}</TableCell>
                <TableCell className="text-right">{p.completedNotes}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={p.compliancePct >= 80 ? 'default' : p.compliancePct >= 50 ? 'secondary' : 'destructive'}
                  >
                    {p.compliancePct}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
