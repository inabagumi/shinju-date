import { Duration } from 'date-fns'

function isZeroSeconds(duration: Duration): boolean {
  return !Object.values(duration).some((value) => value && value > 0)
}

export default isZeroSeconds
