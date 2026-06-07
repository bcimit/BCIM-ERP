export const theme = {
  colors: {
    primary: '#0f2d64',
    primary2: '#2357d9',
    accent: '#f6c343',
    bg: '#f4f7fb',
    card: '#ffffff',
    text: '#071327',
    muted: '#64748b',
    border: '#dbe5f2',
    success: '#0f9f6e',
    danger: '#d92d20'
  },
  spacing: {
    page: 16,
    radius: 14
  }
};

export const currency = (value) => {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
