export const REPORT_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

/**
 * Trae todas las filas de una consulta paginando con rangos inclusivos [from, to].
 * El servidor devuelve como máximo 1000 filas por pedido; sin paginar, los conteos
 * de clínicas grandes quedarían truncados. La consulta debe tener un orden estable.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = REPORT_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
