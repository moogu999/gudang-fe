const ones = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
  'Dua Belas',
  'Tiga Belas',
  'Empat Belas',
  'Lima Belas',
  'Enam Belas',
  'Tujuh Belas',
  'Delapan Belas',
  'Sembilan Belas',
]

function hundredsToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ones[n]

  const tens = Math.floor(n / 10)
  const remainder = n % 10
  const tensWords = [
    '',
    '',
    'Dua Puluh',
    'Tiga Puluh',
    'Empat Puluh',
    'Lima Puluh',
    'Enam Puluh',
    'Tujuh Puluh',
    'Delapan Puluh',
    'Sembilan Puluh',
  ]
  return remainder === 0 ? tensWords[tens] : `${tensWords[tens]} ${ones[remainder]}`
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return ''
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100
  let result = ''
  if (hundreds === 1) {
    result = 'Seratus'
  } else if (hundreds > 1) {
    result = `${ones[hundreds]} Ratus`
  }
  if (remainder > 0) {
    result += result ? ` ${hundredsToWords(remainder)}` : hundredsToWords(remainder)
  }
  return result
}

/** Convert a non-negative integer to Indonesian words (terbilang). */
export function numberToWords(amount: number): string {
  if (amount === 0) return 'Nol'
  if (!isFinite(amount) || amount < 0) return ''

  const intAmount = Math.floor(amount)
  const groups: { divisor: number; label: string }[] = [
    { divisor: 1_000_000_000_000, label: 'Triliun' },
    { divisor: 1_000_000_000, label: 'Miliar' },
    { divisor: 1_000_000, label: 'Juta' },
    { divisor: 1_000, label: 'Ribu' },
    { divisor: 1, label: '' },
  ]

  const parts: string[] = []
  let remaining = intAmount

  for (const { divisor, label } of groups) {
    const count = Math.floor(remaining / divisor)
    remaining %= divisor
    if (count === 0) continue
    if (divisor === 1_000 && count === 1) {
      parts.push('Seribu')
    } else {
      const words = threeDigitsToWords(count)
      parts.push(label ? `${words} ${label}` : words)
    }
  }

  return parts.join(' ')
}

/** Format a decimal string as Indonesian Rupiah words, e.g. "9395000.00" → "Sembilan Juta ..." */
export function decimalToWords(decimalStr: string): string {
  const num = parseFloat(decimalStr)
  if (isNaN(num)) return ''
  return numberToWords(Math.round(num))
}
