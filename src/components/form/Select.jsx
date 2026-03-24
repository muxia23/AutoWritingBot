/**
 * 下拉选择框组件
 */

export default function Select({
  id,
  label,
  required = false,
  placeholder = '请选择',
  value = '',
  onChange,
  options = [],
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
      <select
        id={id}
        className={`form-control ${error ? 'has-error' : ''}`}
        value={value}
        onChange={onChange}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
