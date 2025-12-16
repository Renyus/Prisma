type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextInput({ label, className = "", ...props }: TextInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        {...props}
        className={`w-full px-4 py-2 rounded-xl border border-gray-200 bg-white focus:border-gray-300 outline-none ${className}`}
      />
    </div>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  rows?: number;
};

export function TextArea({ label, rows = 3, className = "", ...props }: TextAreaProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <textarea
        rows={rows}
        {...props}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-gray-300 outline-none ${className}`}
      />
    </div>
  );
}
