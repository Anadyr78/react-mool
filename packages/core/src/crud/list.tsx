import React, {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { UseQueryResult } from "react-query"
import { GetListOutput, GetListParams, SortOrder, useGetList } from "../dataProvider"
import { useLastListParams } from "../helpers/useLastListParams"
import { useSyncListParamsWithURL } from "../helpers/useSyncListParamsWithURL"
import { useNotify } from "../notify"
import { ResourceContext, useResource } from "../resource"
import { LoadListErrorHandler, LoadListSuccessHandler } from "./types"

function mergeFilters<TFilter = any>(filter1: TFilter, filter2: TFilter) {
  return {
    ...filter1,
    ...filter2,
  }
}

export type UseListOptions<TRecord = any, TFilter = any> = {
  resource?: string
  initialPage?: number
  initialPageSize?: number
  initialSortField?: string
  initialSortOrder?: SortOrder
  initialFilter?: TFilter
  baseFilter?: TFilter
  onLoadSuccess?: LoadListSuccessHandler<TRecord>
  onLoadError?: LoadListErrorHandler<TFilter>
  syncWithURL?: boolean
  restoreFromLast?: boolean
  restoreKey?: string
}

export type UseListResult<TRecord = any, TFilter = any> = {
  resource: string
  items: TRecord[]
  total: number
  page: number
  pageSize: number
  sortField?: string | undefined
  sortOrder: SortOrder
  filter?: TFilter | undefined
  isLoading: boolean
  isLoaded: boolean
  query: UseQueryResult<GetListOutput<TRecord>>
  defaults: {
    page: number
    pageSize: number
    sortField?: string | undefined
    sortOrder: SortOrder
    filter?: TFilter | undefined
  }
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setSort: (field: string | undefined, order?: SortOrder) => void
  setFilter: (filter: TFilter) => void
  reset: () => void
}

export function useList<TRecord = any, TFilter = any>(
  options: UseListOptions<TRecord, TFilter> = {}
): UseListResult<TRecord, TFilter> {
  const {
    resource: resourceOpt,
    initialPage = 1,
    initialPageSize = 20,
    initialSortField,
    initialSortOrder = "asc",
    initialFilter,
    baseFilter,
    onLoadSuccess,
    onLoadError,
    syncWithURL = true,
    restoreFromLast = true,
    restoreKey,
  } = options

  const resource = useResource(resourceOpt)
  const notify = useNotify()

  const [page, setPage] = useState(Math.max(1, initialPage))
  const [pageSize, setPageSize] = useState(Math.max(1, initialPageSize))
  const [sortField, setSortField] = useState(initialSortField)
  const [sortOrder, setSortOrder] = useState(initialSortOrder)
  const [filter, setFilter] = useState(initialFilter)

  const mergedFilter = useMemo(
    () => mergeFilters(baseFilter, filter),
    [baseFilter, filter]
  )

  const listParams: GetListParams<TFilter> = {
    page: page,
    pageSize: pageSize,
    sortField: sortField,
    sortOrder: sortOrder,
    filter: mergedFilter,
  }

  const query = useGetList<TRecord, TFilter>(listParams, {
    resource,
    onSuccess: ({ items, total }) => {
      onLoadSuccess?.({ items, total })
    },
    onError: (error) => {
      // default handler
      const handleError = () => {
        const message = error instanceof Error ? error.message : String(error)
        notify(message, { type: "danger" })
      }

      // call custom handler, if any, or the default handler
      if (onLoadError) {
        onLoadError({ error, listParams }, handleError)
      } else {
        handleError()
      }
    },
  })

  const setSort = useCallback(
    (field: string | undefined, order?: SortOrder) => {
      setSortField(field)
      setSortOrder((prev) => order || prev)
    },
    [setSortField, setSortOrder]
  )

  const updatePage = useCallback(
    (page: number) => {
      // Prevent page value to be outside of possibile pages calculated by the number of items
      if (query.data?.total != null) {
        const maxPage = Math.ceil(query.data.total / pageSize)
        page = Math.min(page, maxPage)
      }
      // Min page is 1
      page = Math.max(1, page)
      // Update it
      setPage(page)
    },
    [pageSize, query.data?.total]
  )

  const updatePageSize = useCallback(
    (pageSize: number) => {
      setPageSize(Math.max(1, pageSize))
    },
    [page]
  )

  const reset = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
    setSortField(initialSortField)
    setSortOrder(initialSortOrder)
    setFilter(initialFilter)
  }, [])

  // Ensure page value is within the bounds
  useEffect(() => {
    if (query.data?.total != null) {
      const maxPage = Math.ceil(query.data.total / pageSize)
      if (page > maxPage) {
        setPage(maxPage)
      }
    }
  }, [page, query.data?.total])

  const defaults = useMemo(
    () => ({
      page: initialPage,
      pageSize: initialPageSize,
      sortField: initialSortField,
      sortOrder: initialSortOrder,
      filter: initialFilter,
    }),
    [
      initialPage,
      initialPageSize,
      initialSortField,
      initialSortOrder,
      JSON.stringify(initialFilter),
    ]
  )

  const setters = {
    setPage: updatePage,
    setPageSize: updatePageSize,
    setSort,
    setFilter,
    reset,
  }

  useSyncListParamsWithURL({
    params: listParams,
    setters,
    defaults,
    enabled: syncWithURL,
  })

  useLastListParams({
    params: listParams,
    setters,
    storageKey: restoreKey ?? `${resource}-lastparams`,
    enabled: restoreFromLast,
  })

  return {
    resource,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    ...listParams,
    ...setters,
    isLoading: query.isLoading || (query.isPreviousData && query.isFetching),
    isLoaded: !query.isLoading && !query.isError,
    query,
    defaults,
  }
}

export const ListContext = React.createContext<UseListResult | undefined>(undefined)

export function useListContext<TRecord = any, TFilter = any>() {
  const context = React.useContext<UseListResult<TRecord, TFilter> | undefined>(
    ListContext
  )
  if (!context) {
    throw new Error(`ListContext not found.`)
  }
  return context
}

export type ListBaseProps<TRecord = any, TFilter = any> = UseListOptions<
  TRecord,
  TFilter
> & {
  children: ReactNode | ((list: UseListResult<TRecord, TFilter>) => ReactElement)
}

export const ListBase = (options: ListBaseProps) => {
  const { children, ...listOptions } = options
  const list = useList(listOptions)

  const body = children instanceof Function ? children(list) : children

  return (
    <ResourceContext.Provider value={list.resource}>
      <ListContext.Provider value={list}>{body}</ListContext.Provider>
    </ResourceContext.Provider>
  )
}
