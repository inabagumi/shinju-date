export default function (values: string | string[]): string {
  return (Array.isArray(values) ? values[0] : values) || ''
}
