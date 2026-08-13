export type FamilyMemberDraft = {
  id: string;
  fullName: string;
};

export function normalizeFamilyMemberName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function createFamilyMemberDraft(name: string): FamilyMemberDraft | null {
  const fullName = normalizeFamilyMemberName(name);
  if (fullName.length < 3) return null;
  return { id: `family-${Date.now()}-${Math.random().toString(16).slice(2)}`, fullName };
}

export function removeFamilyMemberDraft(members: FamilyMemberDraft[], id: string) {
  return members.filter((member) => member.id !== id);
}
