import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCatalogueQuery, buildCategoryLookup, buildCatalogueFilter, buildCatalogueSort, escapeCatalogueRegex, buildCatalogueFacetPipelines } from '../src/services/catalogueRules.js'
const categoryId = '64a000000000000000000001'
test('normalizes pagination, search, filters and allowed sort values', () => {
  assert.deepEqual(normalizeCatalogueQuery({page:'3',limit:'100',q:'  cotton tee ',category:'t-shirts',minPrice:'500',maxPrice:'2500',size:' M ',color:'Black',inStock:'true',sale:'1',sort:'price-low'}), {
    page:3,limit:48,q:'cotton tee',category:'t-shirts',minPrice:500,maxPrice:2500,size:'M',color:'Black',tag:'',inStock:true,sale:true,sort:'price-low'
  })
})
test('clamps invalid page and limit defaults and rejects invalid BDT ranges', () => {
  const normalized=normalizeCatalogueQuery({page:'-2',limit:'0',sort:'untrusted-sort'})
  assert.equal(normalized.page,1);assert.equal(normalized.limit,12);assert.equal(normalized.sort,'newest')
  assert.throws(()=>normalizeCatalogueQuery({minPrice:'900',maxPrice:'800'}),{status:400})
  assert.throws(()=>normalizeCatalogueQuery({minPrice:'-1'}),{status:400})
})
test('resolves category identifiers or exact slug/name lookups safely', () => {
  assert.deepEqual(buildCategoryLookup(categoryId),{_id:categoryId,isActive:true})
  const lookup=buildCategoryLookup('T-Shirts')
  assert.equal(lookup.isActive,true);assert.equal(lookup.$or[0].slug,'t-shirts')
  assert.equal(lookup.$or[1].name.test('t-shirts'),true);assert.equal(lookup.$or[1].name.test('t-shirts extra'),false)
})
test('escapes user search text so regex operators are treated literally', () => {
  const regex=new RegExp(escapeCatalogueRegex('tee.(new)+'),'i')
  assert.equal(regex.test('TEE.(NEW)+'),true);assert.equal(regex.test('tee new'),false)
})
test('builds published, category, price, stock and sale filters', () => {
  const filters=normalizeCatalogueQuery({q:'cotton',minPrice:'700',maxPrice:'1800',inStock:'1',sale:'true'})
  const filter=buildCatalogueFilter(filters,categoryId)
  assert.equal(filter.isPublished,true);assert.equal(filter.category,categoryId)
  assert.deepEqual(filter.price,{$gte:700,$lte:1800});assert.deepEqual(filter.stock,{$gt:0})
  assert.deepEqual(filter.$expr,{$gt:[{$ifNull:['$compareAtPrice',0]},'$price']})
  assert.equal(filter.$and[0].$or[0].name.test('cotton shirt'),true)
})
test('matches size and colour on the same available variant', () => {
  const filters=normalizeCatalogueQuery({size:'M',color:'Navy',inStock:'true'})
  const variant=buildCatalogueFilter(filters).$and[0].$or[0].variantStocks.$elemMatch
  assert.equal(variant.size.test('m'),true);assert.equal(variant.color.test('navy'),true);assert.deepEqual(variant.stock,{$gt:0})
})
test('uses deterministic catalogue ordering for supported sorts', () => {
  assert.deepEqual(buildCatalogueSort('price-low'),{price:1,_id:1})
  assert.deepEqual(buildCatalogueSort('price-high'),{price:-1,_id:-1})
  assert.deepEqual(buildCatalogueSort('recommended'),{isFeatured:-1,isBestSeller:-1,createdAt:-1,_id:-1})
})

test('builds catalogue-wide facets without narrowing them to selected size, colour or price', () => {
  const filters = normalizeCatalogueQuery({
    category: 't-shirts', q: 'cotton', minPrice: '500', maxPrice: '1500',
    size: 'M', color: 'Black', inStock: 'true', sale: 'true'
  })
  const pipelines = buildCatalogueFacetPipelines(filters, categoryId)
  const match = pipelines.sizes[0].$match
  assert.equal(match.isPublished, true)
  assert.equal(match.category, categoryId)
  assert.equal(match.price, undefined)
  assert.deepEqual(match.stock, { $gt: 0 })
  assert.deepEqual(match.$expr, { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, '$price'] })
  assert.equal(match.$and.length, 1)
  assert.equal(match.$and[0].$or[0].name.test('cotton shirt'), true)
  assert.equal(pipelines.sizes[1].$project.values.$setUnion.length, 2)
  assert.equal(pipelines.colors[1].$project.values.$setUnion.length, 2)
  assert.deepEqual(pipelines.priceRange[1].$group, {
    _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' }, productCount: { $sum: 1 }
  })
})
