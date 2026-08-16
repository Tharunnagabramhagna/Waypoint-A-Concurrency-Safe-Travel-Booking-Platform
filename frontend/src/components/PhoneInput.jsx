import React from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function InternationalPhoneInput({
  label = 'Phone (Optional)',
  value = '',
  onChange,
  id = 'phone',
  error,
  ...props
}) {
  const isInvalid = value && value.trim() !== '' && !isValidPhoneNumber(value);

  return (
    <div className="w-full relative">
      {label && (
        <label htmlFor={id} className="login-label">
          {label}
        </label>
      )}
      <div className="relative">
        <PhoneInput
          id={id}
          international
          defaultCountry="IN"
          value={value || ''}
          onChange={(val) => onChange(val || '')}
          className={`w-full glass px-4 py-2.5 rounded-2xl text-ink text-body-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-route/30 focus-within:border-route/50 ${
            isInvalid ? 'ring-2 ring-red-400 border-red-500' : ''
          }`}
          numberInputProps={{
            className: 'w-full bg-transparent text-ink text-body-sm placeholder-ink/40 focus:outline-none py-1 ml-2 font-normal',
            'aria-label': 'Phone number',
          }}
          {...props}
        />
      </div>
      {isInvalid && (
        <p className="text-red-500 text-xs mt-1.5 font-medium">
          Please enter a valid phone number for the selected country.
        </p>
      )}
      {error && !isInvalid && (
        <p className="text-red-500 text-xs mt-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export { isValidPhoneNumber };
