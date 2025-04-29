// ConfirmationDialog.jsx
import React from "react";
import "./ConfirmationDialogModal.css";

const ConfirmationDialogModal = ({
  showDialog,
  dialogTitle,
  dialogText,
  onCancel,
  onConfirm,
}) => {
  if (!showDialog) return null;

  return (
    <div
      className="confirmation-dialog-modal__overlay"
      onClick={() => onCancel()}
    >
      <div
        className="confirmation-dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="confirmation-dialog-modal__title">{dialogTitle}</h3>
        <div className="confirmation-dialog-modal__content">
          <p>{dialogText}</p>
        </div>
        <div className="confirmation-dialog-modal__actions">
          <button
            className="confirmation-dialog-modal__button confirmation-dialog-modal__button--cancel"
            onClick={() => onCancel()}
          >
            Cancel
          </button>
          <button
            className="confirmation-dialog-modal__button confirmation-dialog-modal__button--confirm"
            onClick={onConfirm}
          >
            Yes, I'm sure
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialogModal;
