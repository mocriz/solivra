import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FiZoomIn, FiZoomOut } from "react-icons/fi";
import Modal from "./Modal";
import Button from "./Button";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const ImageCropModal = ({
  isOpen,
  imageSrc,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  // Hooks harus selalu dipanggil
  const formattedZoom = useMemo(
    () => (Math.round(zoom * 100) / 100).toFixed(2),
    [zoom]
  );

  const handleZoomStep = useCallback(
    (direction) => {
      const next = clampZoom(zoom + direction * ZOOM_STEP);
      onZoomChange(Number(next.toFixed(3)));
    },
    [onZoomChange, zoom]
  );

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleZoomStep(event.deltaY < 0 ? 1 : -1);
    },
    [handleZoomStep]
  );

  // Baru di sini boleh conditional return
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="xl"
      title={t("editProfile.cropPhotoTitle")}
    >
      <div className="px-6 pb-6 space-y-6">
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative h-[18rem] w-full max-w-[22rem] overflow-hidden rounded-2xl bg-black/80 shadow-inner sm:h-[20rem] sm:max-w-[24rem]"
            onWheelCapture={handleWheel}
          >
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropComplete}
                showGrid={false}
                restrictPosition
              />
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">
                {t("editProfile.cropNoImage")}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/15" />
          </div>
          <p className="max-w-sm text-center text-xs text-text-secondary sm:text-sm">
            {t("editProfile.cropInstructionsTip")}
          </p>
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between text-sm font-medium text-text-primary">
              <span>{t("editProfile.cropZoomLabel")}</span>
              <span className="text-text-secondary">{formattedZoom}x</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-text-primary transition hover:bg-secondary/70"
                onClick={() => handleZoomStep(-1)}
              >
                <FiZoomOut className="h-5 w-5" />
              </button>
              <input
                id="profile-photo-zoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={(event) => onZoomChange(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-text-primary transition hover:bg-secondary/70"
                onClick={() => handleZoomStep(1)}
              >
                <FiZoomIn className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="sm:min-w-[140px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="sm:min-w-[140px]"
          >
            {t("editProfile.cropConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;
