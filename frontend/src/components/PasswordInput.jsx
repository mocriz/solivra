// client/src/components/PasswordInput.jsx
import { useState } from "react";

const PasswordInput = ({
  name,
  id,
  value,
  onChange,
  required = false,
  label,
  disabled = false,
  helperText,
  isInvalid = false,
  autoComplete,
}) => {
  const [isShown, setIsShown] = useState(false);
  const toggleVisibility = () => {
    if (disabled) return;
    setIsShown((prev) => !prev);
  };

  const inputClasses = `w-full px-4 py-3 text-text-primary bg-surface border ${
    isInvalid
      ? "border-danger focus:ring-[var(--custom-danger)]"
      : "border-border focus:ring-primary focus:border-primary"
  } rounded-xl focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-secondary transition-colors`;

  return (
    <div>
      <label
        htmlFor={id || name}
        className="block text-sm font-medium text-text-secondary mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={isShown ? "text" : "password"}
          name={name}
          id={id || name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={inputClasses}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-xl text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isShown ? "🙈" : "👁️"}
        </button>
      </div>
      {helperText ? (
        <p className="text-xs mt-1 text-danger">{helperText}</p>
      ) : null}
    </div>
  );
};

export default PasswordInput;
