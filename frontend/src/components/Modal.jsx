// client/src/components/Modal.jsx

const Modal = ({ isOpen, onClose, title, children, size = 'sm' }) => {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className={`bg-surface rounded-2xl shadow w-full ${sizes[size]}`} onClick={(e) => e.stopPropagation()}>
                {title && (
                    <h3 className="text-xl font-bold text-center mb-4 text-text-primary px-6 pt-6">{title}</h3>
                )}
                {children}
            </div>
        </div>
    );
};

export default Modal;
