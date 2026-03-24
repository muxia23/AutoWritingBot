/**
 * 表单字段容器组件
 */

export default function FormField({ label, required = false, error, hint, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className={required ? 'required' : ''}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="form-error">{error}</p>}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
