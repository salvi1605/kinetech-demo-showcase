/**
 * Utilidades de exportación para reportes: CSV y PDF (window.print)
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell);
        // Escapar comillas y envolver si contiene coma o comillas
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(title: string) {
  // Inyectar estilos de impresión temporales
  const style = document.createElement('style');
  style.id = 'report-print-styles';
  style.textContent = `
    @media print {
      body * { visibility: hidden; }
      .report-printable, .report-printable * { visibility: visible; }
      .report-printable { 
        position: absolute; 
        left: 0; top: 0; 
        width: 100%;
        padding: 20px;
      }
      .no-print { display: none !important; }
      @page { margin: 1cm; }
    }
  `;
  document.head.appendChild(style);

  document.title = title;
  window.print();

  // Limpiar
  setTimeout(() => {
    const el = document.getElementById('report-print-styles');
    if (el) el.remove();
  }, 1000);
}
