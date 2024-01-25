export function getInitials(name: string) {
  const words = name.split(" ");
  const initials = words
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.length > 1 ? initials.slice(0, 2) : initials;
}
