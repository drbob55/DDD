export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString()
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}
