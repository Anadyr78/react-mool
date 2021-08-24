import { useLocale } from "@react-mool/core"
import { formatNumber } from "../../helpers/formatNumber"
import { ColumnProps } from "./Column"

export type NumberColumnProps = ColumnProps & {
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
}

export const NumberColumn: React.FC<NumberColumnProps> = (props) => {
  const { locale, formatOptions } = props

  const value = Number(props.value)
  const defaultLocale = useLocale()

  if (isNaN(value)) {
    return null
  } else {
    return <>{formatNumber(value, locale ?? defaultLocale, formatOptions)}</>
  }
}

NumberColumn.defaultProps = {
  align: "right",
}
