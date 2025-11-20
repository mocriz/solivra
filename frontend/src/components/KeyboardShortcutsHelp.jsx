// client/src/components/KeyboardShortcutsHelp.jsx
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { IoKeypad, IoNavigateCircle, IoFlash, IoHelp } from 'react-icons/io5';

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const shortcutSections = [
    {
      title: t('shortcuts.navigationTitle'),
      icon: <IoNavigateCircle className="w-5 h-5 text-primary" />,
      shortcuts: [
        { key: '1', description: t('shortcuts.dashboard') },
        { key: '2', description: t('shortcuts.history') },
        { key: '3', description: t('shortcuts.stats') },
        { key: '4', description: t('shortcuts.profile') },
        { key: '5', description: t('shortcuts.settings') },
        { key: '6', description: t('shortcuts.guide') }
      ]
    },
    {
      title: t('shortcuts.actionsTitle'),
      icon: <IoFlash className="w-5 h-5 text-primary" />,
      shortcuts: [
        { key: 'F', description: t('shortcuts.relapseModal'), note: t('shortcuts.dashboardOnly') },
        { key: 'S', description: t('shortcuts.toggleSidebar'), note: t('shortcuts.desktopOnly') }
      ]
    },
    {
      title: t('shortcuts.helpTitle'),
      icon: <IoHelp className="w-5 h-5 text-primary" />,
      shortcuts: [
        { key: '?', description: t('shortcuts.helpModal') }
      ]
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shortcuts.modalTitle')} size="lg" style={{ maxHeight: '50px', overflowY: 'auto' }}>
      <div className="px-6 pb-6 max-h-[600px] overflow-y-scroll">
        <div className="flex items-center gap-2 mb-6">
          <IoKeypad className="w-6 h-6 text-primary" />
          <p className="text-text-secondary">{t('shortcuts.modalDescription')}</p>
        </div>

        <div className="space-y-6">
          {shortcutSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <div className="flex items-center gap-2">
                {section.icon}
                <h3 className="text-lg font-semibold text-text-primary">
                  {section.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {section.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 text-sm font-mono font-medium text-text-primary bg-secondary border border-border rounded-md min-w-[2.5rem] text-center">
                        {shortcut.key}
                      </kbd>
                      <span className="text-text-primary">{shortcut.description}</span>
                    </div>
                    {shortcut.note && (
                      <span className="text-xs text-text-secondary italic">
                        {shortcut.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
              <span className="text-xs text-primary font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {t('shortcuts.tipTitle')}
              </p>
              <p className="text-xs text-text-secondary">
                {t('shortcuts.tipDescription')}
              </p>
            </div>
          </div>
        </div>

      </div>
        <div className="flex justify-end py-2 px-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
