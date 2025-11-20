// client/src/components/RelapseCard.jsx
import { useState } from "react";
import { FiEdit2, FiTrash2, FiMoreVertical, FiSave, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { updateRelapse, deleteRelapse } from "../api/relapses";
import toast from "react-hot-toast";
import Modal from "./Modal";
import Button from "./Button";

const RelapseCard = ({ relapse, onUpdate, onDelete }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(relapse.relapse_note || "");
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditNote(relapse.relapse_note || "");
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading(t("profile.updatingNote"));

    try {
      const result = await updateRelapse(relapse._id, {
        relapse_note: editNote,
      });

      toast.success(t("profile.noteUpdated"), { id: loadingToast });
      setIsEditing(false);
      onUpdate(result.relapse);
    } catch {
      toast.error(t("profile.noteUpdateFailed"), { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading(t("profile.deletingRelapse"));

    try {
      await deleteRelapse(relapse._id);
      toast.success(t("profile.relapseDeleted"), { id: loadingToast });
      setShowDeleteModal(false);
      onDelete(relapse._id);
    } catch {
      toast.error(t("profile.relapseDeleteFailed"), { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-surface rounded-2xl p-4 border border-border hover:border-primary/30 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <p className="text-sm text-text-secondary">
              {formatDate(relapse.relapse_time)}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
              disabled={isLoading}
            >
              <FiMoreVertical className="w-4 h-4 text-text-secondary" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors rounded-t-lg cursor-pointer"
                >
                  <FiEdit2 className="w-3 h-3" />
                  {t("profile.editRelapse")}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors rounded-b-lg text-danger cursor-pointer"
                >
                  <FiTrash2 className="w-3 h-3" />
                  {t("profile.deleteRelapse")}
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder={t("profile.addNote")}
              rows={3}
              className="w-full px-3 py-2 text-text-primary bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg border-danger hover:border-danger-hover text-danger hover:text-danger-hover transition-colors disabled:opacity-50 cursor-pointer"
              >
                <FiX className="w-3 h-3 " />
                {t("profile.cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border-primary border text-primary hover:text-primary hover:border-primary-hover rounded-lg hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                <FiSave className="w-3 h-3" />
                {t("profile.save")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {relapse.relapse_note ? (
              <p className="text-text-primary text-sm leading-relaxed">
                {relapse.relapse_note}
              </p>
            ) : (
              <p className="text-text-secondary text-sm italic">
                {t("profile.noNote")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("profile.deleteRelapse")}
      >
        <div className="space-y-4 m-6">
          <p className="text-text-secondary">
            {t("profile.confirmDelete")} {t("profile.deleteWarning")}
          </p>
          <p className="text-sm text-text-secondary bg-secondary p-3 rounded-lg">
            <strong>Tanggal:</strong> {formatDate(relapse.relapse_time)}
            <br />
            {relapse.relapse_note && (
              <>
                <strong>Catatan:</strong> {relapse.relapse_note}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-4 justify-evenly border-t border-border">
          <Button
            className="w-full hover:bg-white/0  bg-white/0 group"
            onClick={() => setShowDeleteModal(false)}
            disabled={isLoading}
          >
            <span className="text-danger group-hover:text-danger-hover">
              {t("profile.cancel")}
            </span>
          </Button>
          <span className="border-l border-border"></span>
          <Button
            className="w-full hover:bg-white/0  bg-white/0 shadow-none group"
            onClick={handleDelete}
            disabled={isLoading}
          >
            <span className="text-primary group-hover:text-primary-hover">
              {isLoading
                ? t("profile.deletingRelapse")
                : t("profile.deleteRelapse")}
            </span>
          </Button>
        </div>
      </Modal>

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />
      )}
    </>
  );
};

export default RelapseCard;
