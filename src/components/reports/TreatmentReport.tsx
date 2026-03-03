import { useTreatmentReport } from '@/hooks/useReportData';
import { exportToCSV } from '@/utils/reportExport';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Props {
  dateFrom: string;
  dateTo: string;
  practitionerId?: string;
}

export default function TreatmentReport({ dateFrom, dateTo, practitionerId }: Props) {
  const { data, isLoading } = useTreatmentReport({ dateFrom, dateTo, practitionerId });

  const handleExportCSV = () => {
    if (!data) return;
    exportToCSV('reporte-tratamientos',
      ['Tratamiento', 'Sesiones'],
      data.byTreatment.map(t => [t.name, t.count])
    );
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!data || data.byTreatment.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No hay datos para el rango seleccionado.</p>;
  }

  const total = data.byTreatment.reduce((s, t) => s + t.count, 0);

  return (
    <div className="report-printable space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-4 text-foreground">Distribución por Tratamiento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.byTreatment}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.byTreatment.map((t, i) => (
                  <Cell key={i} fill={t.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
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
                <TableHead>Tratamiento</TableHead>
                <TableHead className="text-right">Sesiones</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byTreatment.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </TableCell>
                  <TableCell className="text-right">{t.count}</TableCell>
                  <TableCell className="text-right">{total > 0 ? Math.round((t.count / total) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Monthly stacked bar */}
      {data.monthlyData.length > 1 && (
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-4 text-foreground">Evolución Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.treatmentNames.map((t, i) => (
                <Bar key={t.name} dataKey={t.name} stackId="a" fill={t.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
