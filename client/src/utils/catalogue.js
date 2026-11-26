const ALLOWED_SORTS = new Set(['recommended', 'newest', 'price-low', 'price-high', 'featured', 'best-seller'])
function slugify(value) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
export function buildCatalogueParams(filters = {}) {
  const page=Math.max(1,Math.floor(Number(filters.page)||1))
  const limit=Math.min(48,Math.max(1,Math.floor(Number(filters.limit)||12)))
  const requestedSort=String(filters.sort||'recommended')
  const params={page,limit,sort:ALLOWED_SORTS.has(requestedSort)?requestedSort:'recommended'}
  const query=String(filters.query??filters.q??'').trim().slice(0,80)
  const category=String(filters.category||'').trim()
  const size=String(filters.size||'').trim()
  const color=String(filters.color||'').trim()
  const minPrice=Number(filters.minPrice)
  const maxPrice=Number(filters.maxPrice)
  if(query)params.q=query
  if(category&&category!=='All')params.category=category
  if(Number.isFinite(minPrice)&&minPrice>0)params.minPrice=minPrice
  if(Number.isFinite(maxPrice)&&maxPrice>=0)params.maxPrice=maxPrice
  if(size)params.size=size
  if(color)params.color=color
  if(filters.inStock)params.inStock='true'
  if(filters.sale)params.sale='true'
  return params
}
export function filterPreviewProducts(products,filters={}) {
  const list=Array.isArray(products)?products:[]
  const query=String(filters.query||'').trim().toLowerCase()
  const category=String(filters.category||'').trim()
  const size=String(filters.size||'').trim().toLowerCase()
  const color=String(filters.color||'').trim().toLowerCase()
  const minPrice=Number.isFinite(Number(filters.minPrice))?Number(filters.minPrice):0
  const maxPrice=Number.isFinite(Number(filters.maxPrice))?Number(filters.maxPrice):Infinity
  const matches=list.map((product,index)=>({product,index})).filter(({product})=>{
    const categoryValue=typeof product.category==='object'?product.category?.name:product.category
    const categorySlug=product.categorySlug||(typeof product.category==='object'?product.category?.slug:'')||slugify(categoryValue)
    const matchesCategory=!category||category==='All'||category.toLowerCase()===String(categoryValue||'').toLowerCase()||category.toLowerCase()===String(categorySlug||'').toLowerCase()
    const searchable=[product.name,categoryValue,product.description,...(product.tags||[])].join(' ').toLowerCase()
    const matchesSearch=!query||searchable.includes(query)
    const variants=Array.isArray(product.variantStocks)?product.variantStocks:[]
    const matchesVariant=variants.length?variants.some(variant=>(!size||String(variant.size||'').toLowerCase()===size)&&(!color||String(variant.color||'').toLowerCase()===color)&&(!filters.inStock||Number(variant.stock)>0)):(!size||(product.sizes||[]).some(value=>String(value).toLowerCase()===size))&&(!color||(product.colors||[]).some(value=>String(value).toLowerCase()===color))
    const inStock=variants.length?variants.some(variant=>Number(variant.stock)>0):Number(product.stock||0)>0
    const price=Number(product.price||0)
    const compareAtPrice=Number(product.compareAtPrice||product.oldPrice||0)
    return matchesCategory&&matchesSearch&&matchesVariant&&(!filters.inStock||inStock)&&(!filters.sale||compareAtPrice>price)&&price>=minPrice&&price<=maxPrice
  })
  if(filters.sort==='price-low')matches.sort((a,b)=>Number(a.product.price)-Number(b.product.price)||a.index-b.index)
  else if(filters.sort==='price-high')matches.sort((a,b)=>Number(b.product.price)-Number(a.product.price)||a.index-b.index)
  else if(filters.sort==='recommended')matches.sort((a,b)=>Number(b.product.rating||0)-Number(a.product.rating||0)||a.index-b.index)
  return matches.map(item=>item.product)
}

export function normalizeCatalogueFacets(payload = {}) {
  const normalizeOptions = values => {
    const seen = new Set()
    return (Array.isArray(values) ? values : []).reduce((result, item) => {
      const rawValue = typeof item === 'string' ? item : item?.value ?? item?.label
      const value = String(rawValue ?? '').trim()
      const key = value.toLocaleLowerCase()
      if (!value || seen.has(key)) return result
      seen.add(key)
      const count = Number(typeof item === 'object' ? item?.count : 0)
      result.push({ value, count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0 })
      return result
    }, []).sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }))
  }
  const minPrice = Number(payload.minPrice)
  const maxPrice = Number(payload.maxPrice)
  const productCount = Number(payload.productCount)
  return {
    sizes: normalizeOptions(payload.sizes),
    colors: normalizeOptions(payload.colors),
    minPrice: payload.minPrice != null && Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : null,
    maxPrice: payload.maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0 ? maxPrice : null,
    productCount: Number.isFinite(productCount) && productCount > 0 ? Math.floor(productCount) : 0
  }
}
