import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiTableDataType,
  EuiTableSelectionType,
  HorizontalAlignment,
} from "@elastic/eui"
import {
  useListContext,
  useRedirect,
  useResourceDataProvider,
  useResourceDefinition,
  useTranslate,
} from "@react-mool/core"
import { ReactNode, SyntheticEvent, useCallback, useEffect, useMemo, useRef } from "react"
import isEqual from "react-fast-compare"
import {
  canHandleRowClick,
  getDefaultRowClick,
  getEuiSortField,
  getSortField,
  guessColumns,
  toEuiColumn,
} from "./utils"

export type DatagridColumnType<T = any> = {
  name: string
  header?: ReactNode
  description?: string
  dataType?: EuiTableDataType
  width?: string
  sortable?: boolean | string
  align?: HorizontalAlignment
  truncateText?: boolean
  isMobileHeader?: boolean
  mobileOptions?: {
    show?: boolean
    only?: boolean
    render?: (item: T) => ReactNode
    header?: boolean
  }
  hideForMobile?: boolean
  render?: (value: any, record: T) => ReactNode
}

export type DatagridRowClick<TRecord = any> =
  | "edit"
  | "detail"
  | "select"
  | "none"
  | ((item: TRecord) => void)

export type DatagridRowProps = {
  [index: string]: any
}

export type DatagridProps<TRecord = any> = {
  //filters bulkActions actions
  columns?: DatagridColumnType<TRecord>[]
  rowClick?: DatagridRowClick<TRecord>
  rowProps?: (item: TRecord) => object
  sortable?: boolean
  selectable?: boolean
  empty?: ReactNode
}

export function Datagrid<TRecord = any>(props: DatagridProps<TRecord>) {
  const {
    columns: columnsProp,
    rowClick: rowClickProp,
    rowProps: rowPropsProp,
    sortable = true,
    selectable: selectableProp,
    empty,
  } = props

  const {
    resource,
    items,
    isLoading,
    page,
    pageSize,
    total,
    sortField = "",
    sortOrder,
    selectedIds,
    setPage,
    setPageSize,
    setSort,
    setSelectedIds,
  } = useListContext<TRecord>()

  const translate = useTranslate()
  const redirect = useRedirect()
  const resourceDefinition = useResourceDefinition(resource)
  const resourceDataProvider = useResourceDataProvider(resource)

  const columns = columnsProp
    ? columnsProp.map((col) => toEuiColumn(col, resource, translate))
    : guessColumns(items, resource, translate)

  const handleChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<any>) => {
      setPage(page.index + 1)
      setPageSize(page.size)
      if (sort) {
        setSort(getSortField(String(sort.field), columnsProp), sort.direction)
      }
    },
    [setPage, setPageSize, setSort, columnsProp]
  )

  const rowClick = getDefaultRowClick(rowClickProp, resourceDefinition)

  // If `selectable` prop is not explicitly set, it is true in case `rowClick` is set to `select`
  const selectable = selectableProp == null ? rowClick === "select" : selectableProp

  const rowProps = (item: TRecord) => {
    const handleClick = (event: SyntheticEvent) => {
      if (canHandleRowClick(event)) {
        // In case there are selected rows, or the rowClick behavior is "select",
        // clicking on a row toggles the row.
        if (rowClick === "select" || (selectable && selectedIds.length > 0)) {
          const itemId = resourceDataProvider.id(item)
          if (selectedIds.includes(itemId)) {
            setSelectedIds(selectedIds.filter((id) => id !== itemId))
          } else {
            setSelectedIds([...selectedIds, itemId])
          }
        } else {
          // Otherwise it triggers the rowClick behavior.
          if (rowClick === "detail") {
            redirect("detail", { id: resourceDataProvider.id(item) })
          } else if (rowClick === "edit") {
            redirect("edit", { id: resourceDataProvider.id(item) })
          } else if (rowClick instanceof Function) {
            return rowClick(item)
          }
        }
      }
    }

    const shouldHandleClick =
      rowClick !== "none" || (selectable && selectedIds.length > 0)

    return {
      ...rowPropsProp?.(item),
      onClick: shouldHandleClick ? handleClick : undefined,
    }
  }

  const tableRef = useRef<EuiBasicTable<any>>(null)

  const itemId = useCallback(
    (item: TRecord) => {
      return item ? String(resourceDataProvider.id(item)) : ""
    },
    [resourceDataProvider, resourceDataProvider.id]
  )

  const initialSelected = useMemo(() => {
    return selectedIds.map((id) =>
      items.find((item) => resourceDataProvider.id(item) === id)
    )
  }, [])

  const selection: EuiTableSelectionType<any> = useMemo(() => {
    return {
      initialSelected,
      selectable: () => true,
      onSelectionChange: (selection) => {
        const ids = selection.map((item) => resourceDataProvider.id(item))
        if (!isEqual(ids, selectedIds)) {
          setSelectedIds(ids)
        }
      },
    }
  }, [selectedIds, resourceDataProvider, resourceDataProvider.id])

  useEffect(() => {
    const selectedItems = selectedIds.map((id) =>
      items.find((item) => resourceDataProvider.id(item) === id)
    )
    tableRef.current?.setSelection(selectedItems)
  }, [selectedIds, items, resourceDataProvider, resourceDataProvider.id])

  return (
    <>
      <EuiBasicTable
        ref={tableRef}
        items={items}
        columns={columns}
        loading={isLoading}
        pagination={{ pageIndex: page - 1, pageSize, totalItemCount: total }}
        sorting={{
          sort: {
            field: getEuiSortField(sortField, columnsProp) as any,
            direction: sortOrder,
          },
          readOnly: !sortable,
        }}
        selection={selectable ? selection : undefined}
        itemId={itemId}
        onChange={handleChange}
        rowProps={rowProps}
        noItemsMessage={empty}
      />
    </>
  )
}
