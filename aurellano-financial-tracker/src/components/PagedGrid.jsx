import { DataGrid } from '@mui/x-data-grid';

const headerSx = {
  border: 0,
  '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader': {
    backgroundColor: 'var(--primary)',
    color: 'var(--neutral-0)',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
  },
  '& .MuiDataGrid-columnSeparator, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-sortIcon': {
    color: 'var(--neutral-0)',
  },
};

const PagedGrid = (props) => (
  <DataGrid
    autoHeight
    rowHeight={68}
    paginationMode="server"
    pageSizeOptions={[10, 20, 50]}
    disableRowSelectionOnClick
    sx={headerSx}
    {...props}
  />
);

export default PagedGrid;
