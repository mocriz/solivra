import { useTranslation } from "react-i18next";
import {
  FiUploadCloud,
  FiTrash2,
  FiX,
  FiInfo,
} from "react-icons/fi";
import Modal from "./Modal";
import Button from "./Button";

const ProfilePicModal = ({
  isOpen,
  onClose,
  onChangePic = () => {},
  onDeletePic = () => {},
  title,
  children,
  imageUrl,
  showActions = true,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const previewSrc = imageUrl || "/default.png";
  const secondaryActionLabel = showActions ? t("common.cancel") : t("common.close");
  const modalSize = showActions ? "md" : "sm";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={" "} size={modalSize}>
      <div className="px-6 pb-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative md:h-68 w-68 overflow-hidden rounded-full border-4 border-border bg-secondary/60 shadow-inner">
            <img
              src={previewSrc}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
          {children ? (
            <p className="text-sm text-text-secondary">{children}</p>
          ) : null}
        </div>

        {showActions ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
                onClick={onChangePic}
              >
                <FiUploadCloud className="h-5 w-5" />
                {t("editProfile.modalUploadOption")}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex w-full items-center justify-center gap-2"
                onClick={onDeletePic}
              >
                <FiTrash2 className="h-5 w-5" />
                {t("editProfile.modalRemoveOption")}
              </Button>
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-secondary/60 p-4 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <FiInfo className="mt-0.5 h-4 w-4 text-text-primary" />
                <span>{t("editProfile.photoModalUploadHint")}</span>
              </div>
              <div className="flex items-start gap-2">
                <FiInfo className="mt-0.5 h-4 w-4 text-text-primary" />
                <span>{t("editProfile.photoModalRemoveHint")}</span>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 font-medium"
            onClick={onClose}
          >
            <FiX className="h-4 w-4" />
            {secondaryActionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfilePicModal;
