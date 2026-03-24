/**
 * 复选框组件
 */

export default function Checkbox({
  id,
  label,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`form-checkbox ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      {label && <label htmlFor={id}>{label}</label>}
    </div>
  );
}
