import { DateTime, DateTimeProps } from "../../utilities"
import { ColumnProps } from "./Column"

export type DateColumnProps = ColumnProps & DateTimeProps

export const DateColumn = (props: DateColumnProps) => {
  const { value, locale, formatOptions } = props

  return <DateTime value={value} locale={locale} formatOptions={formatOptions} />
}
