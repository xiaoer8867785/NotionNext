import BLOG from "@/blog.config"

/**
 * 获取所有页面 ID，融合多策略确保不遗漏文章
 * @param {object} collectionQuery - Notion collection_query 数据
 * @param {string} collectionId - 数据库 collection ID
 * @param {object} collectionView - Notion collection_view 数据
 * @param {string[]} viewIds - 数据库中的所有视图 ID 列表
 * @param {object} block - 页面 block 字典
 * @returns {string[]} 去重后的页面 ID 列表
 */
export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds, block = {}) {
  const pageSet = new Set()
  const targetViewId = viewIds?.[BLOG.NOTION_INDEX || 0]

  // 策略1：page_sort（有顺序，但可能截断）
  if (collectionView && targetViewId) {
    const pageSort = collectionView?.[targetViewId]?.value?.value?.page_sort
    if (Array.isArray(pageSort) && pageSort.length > 0) {
      pageSort.forEach(id => pageSet.add(id))
    }
  }

  // 策略2：collectionQuery 补充 page_sort 截断的记录
  // 注意：补充的记录追加在末尾，不影响已有顺序
  if (collectionQuery && collectionId) {
    const viewQuery = collectionQuery?.[collectionId]
    if (viewQuery) {
      const selectedViewData = targetViewId ? viewQuery[targetViewId] : null
      const queryData = selectedViewData ? [selectedViewData] : Object.values(viewQuery)
      queryData.forEach(viewData => {
        [
          viewData?.collection_group_results?.blockIds,
          viewData?.results?.blockIds,
          viewData?.blockIds,
        ].forEach(ids => {
          if (Array.isArray(ids)) ids.forEach(id => pageSet.add(id))
        })
      })
    }
  }

  // 策略3：扫描 block 字典，找出所有属于该 collection 的页面
  // 这是兜底策略，确保即使 Notion 视图配置变更也不会遗漏文章
  if (block && collectionId) {
    Object.entries(block).forEach(([id, blockEntry]) => {
      if (!blockEntry) return
      // 兼容新旧双层嵌套结构
      const blockValue = blockEntry?.value?.value || blockEntry?.value
      if (!blockValue) return
      if (blockValue.type === 'page' && blockValue.parent_id === collectionId) {
        pageSet.add(id)
      }
    })
  }

  return [...pageSet]
}
