/**
 * 多行文本框组件
 */

export default function TextArea({
  id,
  label,
  required = false,
  placeholder = '',
  value = '',
  onChange,
  rows = 3,
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
      <textarea
        id={id}
        className={`form-control ${error ? 'has-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
