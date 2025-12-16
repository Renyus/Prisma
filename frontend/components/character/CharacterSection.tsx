import { ReactNode } from "react";

type CharacterSectionProps = {
  title: string;
  children: ReactNode;
};

export function CharacterSection({ title, children }: CharacterSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
