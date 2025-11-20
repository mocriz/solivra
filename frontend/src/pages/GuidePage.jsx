// client/src/pages/GuidePage.jsx
import { useTranslation } from 'react-i18next';

const GuidePage = () => {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto max-w-2xl p-6 space-y-6 text-text-primary">
            <h2 className="text-3xl font-bold mb-4">{t('guide.title')}</h2>
            <div className="p-6 bg-surface rounded-xl space-y-4">
                <h3 className="text-lg text-text-secondary">{t('guide.welcomeTitle')}</h3>
                <p className="text-text-secondary">{t('guide.welcomeDescription')}</p>
            </div>
            <div className="p-6 bg-surface rounded-xl space-y-4">
                <h3 className="text-lg text-text-secondary">{t('guide.featuresTitle')}</h3>
                <dl className="space-y-3">
                    <div className='border-b border-secondary pb-3'>
                        <dt className="font-bold">{t('guide.feature1Title')}</dt>
                        <dd className="text-text-secondary">{t('guide.feature1Description')}</dd>
                    </div>
                    <div className='border-b border-secondary pb-3'>
                        <dt className="font-bold">{t('guide.feature2Title')}</dt>
                        <dd className="text-text-secondary">{t('guide.feature2Description')}</dd>
                    </div>
                     <div>
                        <dt className="font-bold">{t('guide.feature3Title')}</dt>
                        <dd className="text-text-secondary">{t('guide.feature3Description')}</dd>
                    </div>
                </dl>
            </div>
            <div className="p-6 bg-surface rounded-xl space-y-4">
                <h3 className="text-lg text-text-secondary ">{t('guide.shortcutsTitle')}</h3>
                <p className="text-text-secondary">{t('guide.shortcutsDescription')}</p>
            </div>
        </div>
    );
};

export default GuidePage;
