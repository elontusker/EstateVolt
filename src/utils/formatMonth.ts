export const formatMonth = (month: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return `${date.toLocaleString('en-US', { month: 'short' })}-${match[1]}`;
};
