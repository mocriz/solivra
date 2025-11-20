import Modal from "./Modal";
import Button from "./Button";
import { useTranslation } from "react-i18next";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-center text-text-secondary px-6">{children}</p>
        <div className="flex gap-4 justify-evenly border-t border-border">
          <Button
            className="w-full hover:bg-white/0 bg-white/0"
            onClick={onClose}
          >
            <span className="text-danger">{t("common.no")}</span>
          </Button>
          <span className="border-l border-border"></span>
          <Button
            className="w-full hover:bg-white/0 bg-white/0 shadow-none"
            onClick={onConfirm}
          >
            <span className="text-primary">
                {t("common.yes")}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
