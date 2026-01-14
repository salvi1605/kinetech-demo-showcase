import { format } from "date-fns";
import { getDatabaseSchemaSQL } from "@/lib/databaseSchema";

/**
 * Downloads the complete database schema as a .sql file
 */
export const downloadSchemaAsSQL = (): void => {
  const schemaContent = getDatabaseSchemaSQL();
  const blob = new Blob([schemaContent], { type: "text/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `kinesiologia-schema-${format(new Date(), "yyyy-MM-dd")}.sql`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
