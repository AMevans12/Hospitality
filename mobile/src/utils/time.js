const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dateLabel = (d) =>
  `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const clock = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const duration = (min) => (min == null ? '--' : `${Math.floor(min / 60)}h ${min % 60}m`);