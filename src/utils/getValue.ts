const defaultValue = ''

function getValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? defaultValue
}

export default getValue
