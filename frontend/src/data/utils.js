export function withIds(list) {
  return list.map((item, i) => ({ ...item, id: i }));
}
