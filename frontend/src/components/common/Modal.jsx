import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export default function Modal({ open, title, children, onClose, actionText, onAction }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {onAction && (
          <Button onClick={onAction} variant="contained">
            {actionText || "Guardar"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
