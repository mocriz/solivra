import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const HistoryPage = () => {
    // Ambil data langsung dari context. Tidak ada lagi useEffect atau useState untuk loading.
    const { userData } = useContext(AuthContext);
    const { t } = useTranslation();

    // Langsung gunakan data `relapses` dari `userData`
    const relapses = userData?.relapses?.sort((a, b) => new Date(b.relapse_time) - new Date(a.relapse_time)) || [];

    if (!userData) {
        // Tampilan ini hanya muncul sesaat jika context belum siap
        return <div className="text-center p-10 text-text-secondary">{t('history.loading')}</div>;
    }

    return (
        <div className="container mx-auto max-w-2xl p-6 space-y-6">
            <h2 className="text-3xl font-bold text-text-primary">{t('history.title')}</h2>
            
            {relapses.length === 0 ? (
                <p className="text-text-secondary">{t('history.empty')}</p>
            ) : (
                <ul className="space-y-3">
                    {relapses.map((relapse) => (
                        <li key={relapse._id || relapse.relapse_time} className="bg-surface p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-text-primary">
                                    {format(new Date(relapse.relapse_time), 'd MMMM yyyy', { locale: id })}
                                </p>
                                {relapse.relapse_note && <p className="text-sm text-text-secondary mt-1">{relapse.relapse_note}</p>}
                            </div>
                            <span className="text-sm text-text-secondary">
                                {format(new Date(relapse.relapse_time), 'HH:mm')}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default HistoryPage;
