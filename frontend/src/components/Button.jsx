// client/src/components/Button.jsx

const Button = ({ children, onClick, type = 'button', variant = 'primary', size = 'md', className = '', disabled = false }) => {
    // Tentukan gaya dasar yang sama untuk semua tombol
    const baseStyle = "font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
    
    // Tentukan ukuran tombol
    const sizes = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-6 py-4 text-lg',
        xl: 'px-8 py-5 text-xl'
    };

    // Tentukan gaya spesifik berdasarkan varian (warna)
    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-hover shadow-light',
        danger: 'bg-danger text-white hover:bg-danger-hover shadow-light',
        secondary: 'bg-secondary text-text-primary hover:bg-surface-hover',
        outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
        ghost: 'text-text-primary hover:bg-surface-hover',
        success: 'bg-success text-white hover:opacity-90 shadow-light',
        warning: 'bg-warning text-white hover:opacity-90 shadow-light'
    };

    // Gabungkan semua class
    const combinedClassName = `${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`;

    return (
        <button
            type={type}
            onClick={onClick}
            className={combinedClassName}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default Button;
