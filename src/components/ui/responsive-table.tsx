import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface TableCellData {
  label: string;
  value: React.ReactNode;
}

interface TableRowData {
  id: string;
  cells: TableCellData[];
  actions?: React.ReactNode;
}

interface ResponsiveTableProps {
  headers: string[];
  data: TableRowData[];
  className?: string;
}

export function ResponsiveTable({ headers, data, className = '' }: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden md:block ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={index}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                {row.cells.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell.value}</TableCell>
                ))}
                {row.actions && <TableCell>{row.actions}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className={`md:hidden space-y-4 ${className}`}>
        {data.map((row) => (
          <Card key={row.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {row.cells.map((cell, cellIndex) => (
                  <div key={cellIndex} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {cell.label}:
                    </span>
                    <div className="text-sm">{cell.value}</div>
                  </div>
                ))}
                {row.actions && (
                  <div className="pt-2 border-t flex gap-2 justify-end">
                    {row.actions}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}