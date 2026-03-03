import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { Printer, BarChart3 } from 'lucide-react';
import { exportToPDF } from '@/utils/reportExport';
import { useReportPractitioners } from '@/hooks/useReportData';
import OperationalReport from '@/components/reports/OperationalReport';
import ProductivityReport from '@/components/reports/ProductivityReport';
import TreatmentReport from '@/components/reports/TreatmentReport';
import ComplianceReport from '@/components/reports/ComplianceReport';

export default function Reports() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [practitionerId, setPractitionerId] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState('operational');

  const { data: practitioners } = useReportPractitioners();

  const tabTitles: Record<string, string> = {
    operational: 'Reporte Operativo',
    productivity: 'Productividad Profesional',
    treatments: 'Sesiones por Tratamiento',
    compliance: 'Cumplimiento Historias Clínicas',
  };

  return (
    <RoleGuard allowedRoles={['admin_clinic', 'tenant_owner']} fallback={<p className="p-8 text-muted-foreground">No tenés acceso a esta sección.</p>}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          </div>
          <Button variant="outline" size="sm" className="no-print" onClick={() => exportToPDF(tabTitles[activeTab])}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">Desde</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">Hasta</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Profesional</Label>
              <Select value={practitionerId} onValueChange={setPractitionerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(practitioners || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Agrupar por</Label>
              <Select value={groupBy} onValueChange={v => setGroupBy(v as 'week' | 'month')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="operational" className="flex-1 min-w-[120px]">Operativo</TabsTrigger>
            <TabsTrigger value="productivity" className="flex-1 min-w-[120px]">Productividad</TabsTrigger>
            <TabsTrigger value="treatments" className="flex-1 min-w-[120px]">Tratamientos</TabsTrigger>
            <TabsTrigger value="compliance" className="flex-1 min-w-[120px]">Cumplimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="operational">
            <OperationalReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              practitionerId={practitionerId && practitionerId !== 'all' ? practitionerId : undefined}
              groupBy={groupBy}
            />
          </TabsContent>

          <TabsContent value="productivity">
            <ProductivityReport dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

          <TabsContent value="treatments">
            <TreatmentReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              practitionerId={practitionerId && practitionerId !== 'all' ? practitionerId : undefined}
            />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceReport dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
