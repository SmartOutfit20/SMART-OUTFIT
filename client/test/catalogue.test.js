import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCatalogueParams, filterPreviewProducts } from '../src/utils/catalogue.js'
test('builds compact API parameters for selected catalogue filters', () => {
  assert.deepEqual(buildCatalogueParams({page:2,limit:12,query:'  cotton tee ',category:'t-shirts',sort:'price-low',minPrice:500,maxPrice:1800,size:'M',color:'Navy',inStock:true,sale:true}), {
    page:2,limit:12,sort:'price-low',q:'cotton tee',category:'t-shirts',minPrice:500,maxPrice:1800,size:'M',color:'Navy',inStock:'true',sale:'true'
  })
})
test('omits empty filters and normalizes unknown sort values', () => {
  assert.deepEqual(buildCatalogueParams({page:0,limit:100,sort:'bad',category:'All'}),{page:1,limit:48,sort:'recommended'})
})
test('filters preview products by category, search, size, stock, sale and BDT range', () => {
  const products=[
    {name:'Cotton Tee',category:'T-Shirts',price:900,oldPrice:1200,sizes:['M'],colors:['Black'],stock:4,rating:4.8},
    {name:'Cotton Shirt',category:'Shirts',price:1600,sizes:['L'],colors:['Navy'],stock:0,rating:4.7},
    {name:'Cargo Pants',category:'Pants',price:1500,oldPrice:1500,sizes:['M'],colors:['Navy'],stock:5,rating:4.9}
  ]
  const result=filterPreviewProducts(products,{category:'t-shirts',query:'cotton',size:'M',color:'Black',inStock:true,sale:true,minPrice:500,maxPrice:1000})
  assert.deepEqual(result.map(product=>product.name),['Cotton Tee'])
})
test('matches size and colour against the same variant for preview data', () => {
  const products=[{name:'Variant Jacket',category:'Outerwear',price:2200,stock:3,sizes:['M','L'],colors:['Black','Navy'],variantStocks:[{size:'M',color:'Black',stock:0},{size:'L',color:'Navy',stock:3}]}]
  assert.equal(filterPreviewProducts(products,{size:'M',color:'Navy',inStock:true}).length,0)
  assert.equal(filterPreviewProducts(products,{size:'L',color:'Navy',inStock:true}).length,1)
})
