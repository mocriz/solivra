import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { deleteAccount } from '../api/users';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal'; // <-- Impor Modal
import { useTranslation } from 'react-i18next';

const DeleteAccountPage = () => {
    const [password, setPassword] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!password) {
            return toast.error(t('deleteAccount.errorMissingPassword'));
        }
        setIsModalOpen(true); // Buka modal konfirmasi
    };
    
    const handleDeleteConfirm = async () => {
        setIsModalOpen(false);
        const loadingToast = toast.loading(t('deleteAccount.loading'));
        try {
            const res = await deleteAccount(password);
            toast.success(res.msg, { id: loadingToast });
            logout();
            navigate('/register');
        } catch (error) {
            toast.error(error.message || t('deleteAccount.errorGeneral'), { id: loadingToast });
        }
    };

    return (
        <>
            <div className="container mx-auto max-w-2xl p-6 space-y-6">
                <div className="bg-surface p-6 rounded-2xl space-y-4">
                    <h2 className="text-2xl font-bold text-danger">{t('deleteAccount.title')}</h2>
                    <div className="p-4 border-2 border-custom-danger rounded-xl text-danger">
                        <p className="font-bold">{t('deleteAccount.warning')}</p>
                        <p className="text-sm mt-1">{t('deleteAccount.warningDescription')}</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4 flex flex-col grow-0">
                        <PasswordInput label={t('deleteAccount.passwordLabel')} name="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <Button type="submit" variant="danger" className="bg-danger/10 border-danger border hover:bg-danger-hover/10 hover:border-danger-hover shadow-light"><span className='text-danger hover:text-danger-hover'>{t('deleteAccount.submit')}</span></Button>
                    </form>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title={t('deleteAccount.modalTitle')}
            >
                {t('deleteAccount.modalMessage')}
            </ConfirmationModal>
        </>
    );
};

export default DeleteAccountPage;
