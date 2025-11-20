// client/src/pages/EditProfilePage.jsx
import { useState, useContext, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { updateProfile, updatePassword, removeProfilePicture } from '../api/users';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import ImageCropModal from '../components/ImageCropModal';
import ProfilePicModal from '../components/ProfilePicModal';
import { useTranslation } from 'react-i18next';
import { apiBase } from '../api/http';
import { getCroppedImageBlob } from '../utils/cropImage';
import {
  sanitizeUsernameInput,
  canonicalizeUsername,
  USERNAME_PATTERN,
  isStrongPassword,
} from '../utils/validation';

const EditProfilePage = () => {
    const { userData, refreshData, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [profileData, setProfileData] = useState({
        nickname: userData?.nickname || '',
        username: userData?.username || '',
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '', new_password: '', confirm_password: '',
    });
    const [usernameStatus, setUsernameStatus] = useState('idle');
    const [usernameMessage, setUsernameMessage] = useState('');
    const [preview, setPreview] = useState(userData?.profile_picture || '/default.png');
    const [isRemovePicModalOpen, setIsRemovePicModalOpen] = useState(false);
    const fileInputRef = useRef();
    const previewObjectUrlRef = useRef(null);
    const cropObjectUrlRef = useRef(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [cropSource, setCropSource] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const resetFileInput = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const updatePreview = useCallback((nextPreview, isObjectUrl = false) => {
        setPreview(nextPreview);
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
        }
        if (isObjectUrl) {
            previewObjectUrlRef.current = nextPreview;
        }
    }, []);

    const releaseCropObjectUrl = useCallback(() => {
        if (cropObjectUrlRef.current) {
            URL.revokeObjectURL(cropObjectUrlRef.current);
            cropObjectUrlRef.current = null;
        }
    }, []);

    const resetCropState = useCallback(() => {
        setIsCropModalOpen(false);
        setSelectedFile(null);
        setCropSource(null);
        setCroppedAreaPixels(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        releaseCropObjectUrl();
        resetFileInput();
    }, [releaseCropObjectUrl, resetFileInput]);

    useEffect(() => {
        const serverPreview = userData?.profile_picture || '/default.png';
        updatePreview(serverPreview, false);
    }, [userData?.profile_picture, updatePreview]);

    useEffect(() => () => {
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        if (cropObjectUrlRef.current) {
            URL.revokeObjectURL(cropObjectUrlRef.current);
        }
    }, []);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            const sanitized = sanitizeUsernameInput(value);
            setProfileData((prev) => ({ ...prev, username: sanitized }));
            setUsernameStatus('idle');
            setUsernameMessage('');
            return;
        }
        setProfileData((prev) => ({ ...prev, [name]: value }));
    };
    const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    useEffect(() => {
        if (!userData?.username) {
            return;
        }

        const raw = profileData.username;

        if (!raw) {
            setUsernameStatus('invalid');
            setUsernameMessage(t('register.usernameRequired'));
            return;
        }

        const sanitized = sanitizeUsernameInput(raw);
        if (sanitized !== raw) {
            setProfileData((prev) => ({ ...prev, username: sanitized }));
        }

        const canonical = canonicalizeUsername(sanitized);
        const originalCanonical = canonicalizeUsername(userData.username);

        if (canonical === originalCanonical) {
            setUsernameStatus('unchanged');
            setUsernameMessage('');
            return;
        }

        if (canonical.length === 0) {
            setUsernameStatus('invalid');
            setUsernameMessage(t('register.usernameRequired'));
            return;
        }

        if (!USERNAME_PATTERN.test(canonical)) {
            setUsernameStatus('invalid');
            setUsernameMessage(t('register.usernameInvalid'));
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        setUsernameStatus('checking');
        setUsernameMessage('');

        const timer = setTimeout(async () => {
            try {
                const response = await axios.get(
                    `${apiBase}/users/check-username/${canonical}`,
                    { withCredentials: true, signal: controller.signal },
                );
                if (cancelled) {
                    return;
                }
                if (response.data?.available) {
                    setUsernameStatus('available');
                    setUsernameMessage('');
                } else {
                    setUsernameStatus('taken');
                    setUsernameMessage('');
                }
            } catch (error) {
                if (controller.signal.aborted || error?.code === 'ERR_CANCELED') {
                    return;
                }
                setUsernameStatus('error');
                setUsernameMessage(t('register.usernameCheckFailed'));
            }
        }, 400);

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timer);
        };
    }, [profileData.username, userData?.username, t]);

    const canonicalUsername = useMemo(
        () => canonicalizeUsername(profileData.username),
        [profileData.username],
    );
    const originalCanonicalUsername = useMemo(
        () => (userData?.username ? canonicalizeUsername(userData.username) : ''),
        [userData?.username],
    );
    const isCheckingUsername = usernameStatus === 'checking';
    const isUsernameAvailable = usernameStatus === 'available' || usernameStatus === 'unchanged';
    const usernameHasError = ['invalid', 'taken', 'error'].includes(usernameStatus);
    const usernameHelperText = useMemo(() => {
        switch (usernameStatus) {
            case 'checking':
                return t('register.usernameChecking');
            case 'invalid':
                return usernameMessage || t('register.usernameInvalid');
            case 'taken':
                return usernameMessage || t('register.usernameTaken');
            case 'available':
                return usernameMessage || t('register.usernameAvailable');
            case 'error':
                return usernameMessage || t('register.usernameCheckFailed');
            default:
                return '';
        }
    }, [usernameStatus, usernameMessage, t]);
    const usernameInputClasses = `w-full px-4 py-3 bg-secondary text-text-primary rounded-xl border ${
        usernameHasError
            ? 'border-danger focus:ring-[var(--custom-danger)]'
            : 'border-transparent focus:ring-primary focus:border-primary'
    } focus:outline-none focus:ring-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed`;

    const isNewPasswordInvalid =
        passwordData.new_password.length > 0 && !isStrongPassword(passwordData.new_password);
    const newPasswordHelperText = isNewPasswordInvalid ? t('register.passwordRequirements') : '';
    const isConfirmPasswordInvalid =
        passwordData.confirm_password.length > 0 &&
        passwordData.confirm_password !== passwordData.new_password;
    const confirmPasswordHelperText = isConfirmPasswordInvalid
        ? t('editProfile.passwordMismatch')
        : '';

    const isProfileFormValid =
        profileData.nickname.trim() !== '' &&
        canonicalUsername.length >= 1 &&
        isUsernameAvailable &&
        !usernameHasError &&
        !isCheckingUsername;

    const isPasswordFormValid =
        passwordData.current_password.trim() !== '' &&
        passwordData.new_password.trim() !== '' &&
        passwordData.confirm_password.trim() !== '' &&
        !isNewPasswordInvalid &&
        !isConfirmPasswordInvalid;

    // --- Alur crop foto profil sebelum upload ---
    const handleFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type?.startsWith('image/')) {
            toast.error(t('editProfile.photoInvalidType'));
            resetFileInput();
            return;
        }

        releaseCropObjectUrl();
        const objectUrl = URL.createObjectURL(file);
        cropObjectUrlRef.current = objectUrl;
        setSelectedFile(file);
        setCropSource(objectUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setIsCropModalOpen(true);
    }, [t, resetFileInput, releaseCropObjectUrl]);

    const handleCropComplete = useCallback((_, area) => {
        setCroppedAreaPixels(area);
    }, []);

    const uploadProfilePhoto = useCallback(async (file) => {
        const loadingToast = toast.loading(t('editProfile.uploadingPhoto'));
        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            await updateProfile(formData);
            await refreshData();
            toast.success(t('editProfile.photoUploadSuccess'), { id: loadingToast });
            resetFileInput();
            return true;
        } catch (error) {
            toast.error(error.message || t('editProfile.photoUploadError'), { id: loadingToast });
            updatePreview(userData?.profile_picture || '/default.png', false);
            return false;
        }
    }, [refreshData, t, resetFileInput, updatePreview, userData?.profile_picture]);

    const handleCropConfirm = useCallback(async () => {
        if (!selectedFile || !croppedAreaPixels || !cropSource) {
            toast.error(t('editProfile.cropMissingData'));
            return;
        }

        try {
            const blob = await getCroppedImageBlob(
                cropSource,
                croppedAreaPixels,
                selectedFile.type || 'image/jpeg',
            );
            const mimeType = blob.type || selectedFile.type || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpeg';
            const safeExtension = extension === 'jpeg' ? 'jpg' : extension;
            const baseName = (selectedFile.name || 'profile_photo').replace(/\.[^/.]+$/, '');
            const normalizedBase =
                baseName.trim().replace(/\s+/g, '_').toLowerCase() || 'profile_photo';
            const croppedFile = new File(
                [blob],
                `${normalizedBase}_cropped.${safeExtension}`,
                { type: mimeType },
            );
            const previewUrl = URL.createObjectURL(blob);
            updatePreview(previewUrl, true);
            const success = await uploadProfilePhoto(croppedFile);
            if (success) {
                resetCropState();
            }
        } catch (error) {
            toast.error(error.message || t('editProfile.cropFailed'));
        }
    }, [
        selectedFile,
        croppedAreaPixels,
        cropSource,
        t,
        updatePreview,
        uploadProfilePhoto,
        resetCropState,
    ]);

    const handleCropCancel = useCallback(() => {
        resetCropState();
    }, [resetCropState]);
    // ----------------------------------------

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (usernameHasError || canonicalUsername.length === 0) {
            toast.error(t('editProfile.usernameInvalidSubmit'));
            return;
        }

        if (isCheckingUsername) {
            toast.error(t('editProfile.usernameValidationPending'));
            return;
        }

        const trimmedNickname = profileData.nickname.trim();

        if (trimmedNickname === '') {
            toast.error(t('editProfile.nicknameRequired'));
            return;
        }

        const submission = new FormData();
        submission.append('nickname', trimmedNickname);
        submission.append('username', canonicalUsername);

        const loadingToast = toast.loading(t('editProfile.updatingProfile'));

        try {
            if (
                trimmedNickname === userData.nickname &&
                canonicalUsername === originalCanonicalUsername
            ) {
                toast.success(t('editProfile.noChanges'), { id: loadingToast });
                return;
            }

            await updateProfile(submission);
            await refreshData();
            setProfileData((prev) => ({
                ...prev,
                nickname: trimmedNickname,
                username: canonicalUsername,
            }));
            setUsernameStatus('unchanged');
            setUsernameMessage('');
            toast.success(t('editProfile.profileUpdated'), { id: loadingToast });
        } catch (error) {
            toast.error(error.message || t('editProfile.profileUpdateError'), { id: loadingToast });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (isNewPasswordInvalid) {
            return toast.error(t('editProfile.passwordTooWeak'));
        }
        if (isConfirmPasswordInvalid) {
            return toast.error(t('editProfile.passwordMismatch'));
        }
        const loadingToast = toast.loading(t('editProfile.updatingPassword'));
        try {
            const res = await updatePassword(passwordData);
            toast.success(res.msg, { id: loadingToast });
            logout(); // Logout setelah password berhasil diubah
            navigate('/login');
        } catch (error) {
            toast.error(error.message || t('editProfile.passwordUpdateError'), { id: loadingToast });
        }
    };

    // Fungsi untuk konfirmasi penghapusan
    const handleConfirmRemovePicture = async () => {
        setIsRemovePicModalOpen(false); // Tutup modal
        const loadingToast = toast.loading(t('editProfile.removingPhoto'));
        try {
            await removeProfilePicture();
            await refreshData();
            updatePreview('/default.png', false);
            toast.success(t('editProfile.photoRemoved'), { id: loadingToast });
        } catch (error) {
            toast.error(error.message || t('editProfile.photoRemoveError'), { id: loadingToast });
        }
    };

    const hasCustomPhoto = Boolean(
        userData?.profile_picture && !userData.profile_picture.includes('default.png'),
    );

    return (
        <>
            <div className="container mx-auto max-w-2xl p-6 space-y-8">
                {/* Form Edit Profil */}
                <form onSubmit={handleProfileSubmit} className="bg-surface p-6 rounded-2xl space-y-4">
                    <h2 className="text-2xl font-bold">{t('editProfile.editDetailsTitle')}</h2>
                    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex justify-center sm:justify-start">
                            <img
                                src={preview}
                                alt={t('editProfile.photoAlt')}
                                className="h-24 w-24 rounded-full border-4 border-surface shadow-lg object-cover sm:h-28 sm:w-28 md:h-32 md:w-32"
                            />
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                            {/* Saat sudah ada foto kustom, tampilkan modal pilihan */}
                            {hasCustomPhoto ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                    onClick={() => setIsRemovePicModalOpen(true)}
                                >
                                    {t('editProfile.changePhoto')}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    {t('editProfile.changePhoto')}
                                </Button>
                            )}
                            <p className="text-sm text-text-secondary sm:max-w-[220px]">
                                {t('editProfile.photoHelperText')}
                            </p>
                        </div>
                        {/* File input memicu modal crop sebelum upload */}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.nicknameLabel')}</label>
                        <input type="text" id="nickname" name="nickname" autoComplete="name" value={profileData.nickname} onChange={handleProfileChange} className="w-full px-4 py-3 bg-secondary rounded-xl"/>
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.usernameLabel')}</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            autoComplete="username"
                            value={profileData.username}
                            onChange={handleProfileChange}
                            className={usernameInputClasses}
                        />
                        {usernameHelperText ? (
                            <p
                                className={`text-xs mt-1 ${
                                    usernameStatus === 'available'
                                        ? 'text-success'
                                        : usernameHasError
                                            ? 'text-danger'
                                            : 'text-text-secondary'
                                }`}
                            >
                                {usernameHelperText}
                            </p>
                        ) : null}
                    </div>
                    <Button type="submit" disabled={!isProfileFormValid}>{t('editProfile.saveChanges')}</Button>
                </form>

                {/* Form Ubah Password */}
                <form onSubmit={handlePasswordSubmit} className="bg-surface p-6 rounded-2xl space-y-4">
                    <h2 className="text-2xl font-bold">{t('editProfile.changePasswordTitle')}</h2>
                    <PasswordInput
                        label={t('editProfile.currentPasswordLabel')}
                        name="current_password"
                        id="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                    />
                    <PasswordInput
                        label={t('editProfile.newPasswordLabel')}
                        name="new_password"
                        id="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        isInvalid={isNewPasswordInvalid}
                        helperText={newPasswordHelperText}
                        autoComplete="new-password"
                    />
                    <PasswordInput
                        label={t('editProfile.confirmPasswordLabel')}
                        name="confirm_password"
                        id="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        isInvalid={isConfirmPasswordInvalid}
                        helperText={confirmPasswordHelperText}
                        autoComplete="new-password"
                    />
                    <Button type="submit" variant="secondary" disabled={!isPasswordFormValid}>{t('editProfile.updatePasswordButton')}</Button>
                </form>
            </div>

            <ImageCropModal
                isOpen={isCropModalOpen}
                imageSrc={cropSource}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
                onConfirm={handleCropConfirm}
            />

            {/* Modal Konfirmasi Hapus Foto Profil */}
            <ProfilePicModal
                isOpen={isRemovePicModalOpen}
                onClose={() => setIsRemovePicModalOpen(false)}
                onDeletePic={handleConfirmRemovePicture}
                onChangePic={() => { fileInputRef.current.click(); setIsRemovePicModalOpen(false); }} 
                title={t('editProfile.photoModalTitle')}
                imageUrl={preview}
            >
                {t('editProfile.photoModalMessage')}
            </ProfilePicModal>
        </>
    );
};

export default EditProfilePage;
