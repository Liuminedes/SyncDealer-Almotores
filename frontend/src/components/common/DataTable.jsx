import { DataGrid } from "@mui/x-data-grid";

export default function DataTable({ rows, columns, loading }) {
  return (
    <div style={{ height: 520, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
      />
    </div>
  );
}
