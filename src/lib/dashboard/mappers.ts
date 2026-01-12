export class DashboardMappers {
  static parseFrom(input: Record<string, unknown>, groupBy: Array<string>): string {
    const lookingFor = groupBy[0]
    const keys = Object.keys(input)
    if (keys.includes(lookingFor)) {
      if (groupBy.length == 1) {
        return input[lookingFor] as string
      } else {
        const next = input[lookingFor] as Record<string, unknown>
        return this.parseFrom(next, groupBy.splice(1))
      }
    }
    return ""
  }

  static removeDisplayByIfNeeded(
    input: Record<string, unknown>,
    display: Array<string>,
  ): void {
    const toRemove = display[0]
    const keys = Object.keys(input)
    if (keys.includes(toRemove)) {
      if (display.length == 1) {
        delete input[toRemove]
      } else {
        const next = input[toRemove] as Record<string, unknown>
        this.removeDisplayByIfNeeded(next, display.slice(1))
      }
    }
  }

  static genStrings(input_key: string, input: Record<string, unknown>): Array<string> {
    let out: string[] = []
    const keys = Object.keys(input)
    const next_key = input_key.length == 0 ? '' : input_key + '.'
    keys.forEach((key) => {
      const v = input[key]
      if (v == null) {
        console.warn(`Found null value ${key} in ${JSON.stringify(input)}`)
      } else if (typeof v === 'object') {
        const next = this.genStrings(next_key + key, v as Record<string, unknown>)
        out = out.concat(next)
      } else {
        out.push(next_key + key)
      }
    })
    return out
  }
}

export * from "../dashboard-service"
