/**
 * 输入框组件
 */

export default function Input({
  id,
  label,
  required = false,
  placeholder = '',
  value = '',
  onChange,
  type = 'text',
  error = '',
  hint = '',
  className = '',
  ...props
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className={required ? 'required' : ''}>
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        className={`form-control ${error ? 'has-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
