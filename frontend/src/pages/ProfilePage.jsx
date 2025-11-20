import { useContext, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import RelapseCard from "../components/RelapseCard";
import ProfilePicModal from "../components/ProfilePicModal";

const ProfilePage = () => {
  const { userData, stats, refreshData } = useContext(AuthContext);
  const { t } = useTranslation();
  const [relapses, setRelapses] = useState(userData?.relapses || []);
  const [isPictureModalOpen, setPictureModalOpen] = useState(false);

  const handleOpenPictureModal = useCallback(() => {
    setPictureModalOpen(true);
  }, []);

  const handleClosePictureModal = useCallback(() => {
    setPictureModalOpen(false);
  }, []);


  const handleRelapseUpdate = useCallback(
    (updatedRelapse) => {
      setRelapses((prev) =>
        prev.map((r) => (r._id === updatedRelapse._id ? updatedRelapse : r)),
      );
      refreshData();
    },
    [refreshData],
  );

  const handleRelapseDelete = useCallback(
    (relapseId) => {
      setRelapses((prev) => prev.filter((r) => r._id !== relapseId));
      refreshData();
    },
    [refreshData],
  );

  if (!userData || !stats) {
    return (
      <div className="text-center p-10 text-text-secondary">
        {t("profile.loading")}
      </div>
    );
  }

  // Update relapses when userData changes
  if (userData.relapses && relapses !== userData.relapses) {
    setRelapses(userData.relapses);
  }

  // Urutkan relapse dari terbaru
  const sortedRelapses = [...relapses].sort(
    (a, b) => new Date(b.relapse_time) - new Date(a.relapse_time),
  );

  return (
    <>
      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-4 sm:flex-col">
          <div className="flex items-center sm:flex-row sm:items-center gap-2 sm:text-left">
            <img
              src={userData.profile_picture}
              alt={t("profile.photoAlt")}
              className="h-24 w-24 flex-shrink-0 rounded-full border-4 border-surface object-cover shadow-md transition hover:opacity-90 sm:h-28 sm:w-28 cursor-pointer"
              onClick={handleOpenPictureModal}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenPictureModal();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={t("profile.photoModalTitle")}
            />
            <div className="w-full ">
              <h1 className="break-words text-xl font-semibold text-text-primary sm:text-2xl">
                {userData.username}
              </h1>
              <p className="break-words text-sm text-text-secondary sm:text-base">
                {userData.nickname}
              </p>
            </div>
          </div>
          <Link
            to="/settings/edit-profile"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border/60 bg-secondary/70 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-secondary/90 sm:w-auto sm:text-base"
          >
            {t("profile.settingsButton")}
          </Link>
        </header>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary sm:text-xl">
            {t("profile.recentActivity")}
          </h3>
          {sortedRelapses.length > 0 ? (
            <div className="space-y-3">
              {sortedRelapses.slice(0, 10).map((relapse) => (
                <RelapseCard
                  key={relapse._id}
                  relapse={relapse}
                  onUpdate={handleRelapseUpdate}
                  onDelete={handleRelapseDelete}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border/60 bg-secondary/60 px-4 py-5 text-center text-sm text-text-secondary">
              {t("profile.noRelapses")}
            </p>
          )}
        </div>
      </div>

      <ProfilePicModal
        isOpen={isPictureModalOpen}
        onClose={handleClosePictureModal}
        title={t("profile.photoModalTitle")}
        imageUrl={userData.profile_picture}
        showActions={false}
      />
    </>
  );
};

export default ProfilePage;
