import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export default function ConfirmDialog({ open, title, children, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button onClick={onConfirm} variant="contained">Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
}
