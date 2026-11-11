/// <reference types="bun" />
import React from 'react';
import { describe, expect, mock, test } from 'bun:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

let role = 'admin_clinic';
mock.module('@/contexts/AppContext', () => ({
  useApp: () => ({ state: { userRole: role, isImpersonatingRole: false, currentClinicId: 'demo-clinic' } }),
}));
mock.module('@/hooks/useReportData', () => ({ useReportPractitioners: () => ({ data: [] }) }));
const stub = () => null;
// Radix necesita DOM real; para verificar visibilidad alcanza con contenedores simples.
const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
mock.module('@/components/ui/tabs', () => ({ Tabs: Pass, TabsList: Pass, TabsTrigger: Pass, TabsContent: Pass }));
mock.module('@/components/ui/select', () => ({
  Select: Pass, SelectContent: Pass, SelectItem: Pass, SelectTrigger: Pass, SelectValue: Pass,
}));
mock.module('@/components/reports/OperationalReport', () => ({ default: stub }));
mock.module('@/components/reports/ProductivityReport', () => ({ default: stub }));
mock.module('@/components/reports/TreatmentReport', () => ({ default: stub }));
mock.module('@/components/reports/ComplianceReport', () => ({ default: stub }));
mock.module('@/components/reports/PractitionerPatientsReport', () => ({ default: stub }));

const { default: Reports } = await import('./Reports');

function renderAs(nextRole: string) {
  role = nextRole;
  let renderer: ReactTestRenderer | undefined;
  act(() => { renderer = create(<Reports />); });
  const text = JSON.stringify(renderer!.toJSON());
  act(() => renderer!.unmount());
  return text;
}

describe('Reports access to "Pacientes por profesional"', () => {
  for (const allowed of ['admin_clinic', 'tenant_owner', 'super_admin']) {
    test(`${allowed} sees the tab`, () => {
      expect(renderAs(allowed)).toContain('Pacientes por profesional');
    });
  }
  for (const denied of ['health_pro', 'receptionist']) {
    test(`${denied} gets no access and no tab`, () => {
      const text = renderAs(denied);
      expect(text).toContain('No tienes acceso a esta sección.');
      expect(text).not.toContain('Pacientes por profesional');
    });
  }
});
