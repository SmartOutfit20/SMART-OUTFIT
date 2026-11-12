import {Router} from 'express'
import {randomBytes} from 'node:crypto'
import {requireAuth,requireRole} from '../middleware/auth.js'
import {Order,Product,Coupon,Setting} from '../models/index.js'
const router=Router()
router.use(requireAuth)
const cleanAddress = input => ({
 name:String(input?.name||'').trim(),
 phone:String(input?.phone||'').trim(),
 division:String(input?.division||'').trim(),
 district:String(input?.district||'').trim(),
 upazila:String(input?.upazila||'').trim(),
 address:String(input?.address||'').trim()
})
router.post('/coupon/validate',requireRole('customer'),async(req,res,next)=>{try{
 const code=String(req.body.code||'').trim().toUpperCase();const subtotal=Number(req.body.subtotal||0)
 if(!code||!Number.isFinite(subtotal)||subtotal<0)return res.status(400).json({message:'Enter a valid coupon code.'})
 const coupon=await Coupon.findOne({code,isActive:true})
 if(!coupon|| (coupon.expiresAt&&coupon.expiresAt<=new Date()) || (coupon.usageLimit&&coupon.usageCount>=coupon.usageLimit))return res.status(404).json({message:'This coupon is invalid, expired or fully used.'})
 if(subtotal<Number(coupon.minimumOrder||0))return res.status(400).json({message:'Minimum order amount for this coupon is ৳'+Number(coupon.minimumOrder||0)})
 const discount=Math.min(subtotal,coupon.type==='fixed'?Number(coupon.value||0):Math.floor(subtotal*Number(coupon.value||0)/100))
 if(discount<=0)return res.status(400).json({message:'This coupon does not provide a valid discount.'})
 res.json({code:coupon.code,discount,type:coupon.type,value:coupon.value,subtotal,totalAfterDiscount:subtotal-discount})
 }catch(e){next(e)}})
router.post('/',requireRole('customer'),async(req,res,next)=>{
 const reserved=[]
 let couponToConsume=null
 try{
  const address=cleanAddress(req.body.deliveryAddress)
  if(!address.name||!/^01[3-9]\\d{8}$/.test(address.phone)||!address.division||!address.district||!address.upazila||address.address.length<8)
   return res.status(400).json({message:'Complete your name, valid Bangladesh phone, division, district, upazila and full address.'})
  const requested=Array.isArray(req.body.items)?req.body.items:[]
  if(!requested.length||requested.length>30)return res.status(400).json({message:'Your cart is empty or contains too many items.'})
  const paymentMethod=req.body.paymentMethod||'cod'
  if(paymentMethod!=='cod')return res.status(400).json({message:'Online payment is not active yet. Please choose Cash on Delivery.'})
  const lineItems=[]
  let subtotal=0
  for(const line of requested){
   const id=String(line.productId||'')
   const quantity=Number(line.quantity)
   if(!/^([a-f0-9]{24})$/i.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>20)throw Object.assign(new Error('Invalid cart item or quantity.'),{status:400})
   const product=await Product.findOneAndUpdate({_id:id,isPublished:true,stock:{$gte:quantity}},{ $inc:{stock:-quantity} },{new:true})
   if(!product)throw Object.assign(new Error('A product is unavailable or has insufficient stock. Refresh your cart and try again.'),{status:409})
   reserved.push({id,quantity})
   const unitPrice=product.price
   subtotal+=unitPrice*quantity
   lineItems.push({product:product._id,name:product.name,sku:product.sku,quantity,unitPrice,size:String(line.size||''),color:String(line.color||'')})
  }
  let discount=0
  const couponCode=String(req.body.couponCode||'').trim().toUpperCase()
  if(couponCode){
   couponToConsume=await Coupon.findOne({code:couponCode,isActive:true})
   if(!couponToConsume||(couponToConsume.expiresAt&&couponToConsume.expiresAt<=new Date())||(couponToConsume.usageLimit&&couponToConsume.usageCount>=couponToConsume.usageLimit)||subtotal<Number(couponToConsume.minimumOrder||0))throw Object.assign(new Error('Coupon is no longer valid for this order.'),{status:400})
   discount=Math.min(subtotal,couponToConsume.type==='fixed'?Number(couponToConsume.value||0):Math.floor(subtotal*Number(couponToConsume.value||0)/100))
   if(discount<=0)throw Object.assign(new Error('Coupon discount is invalid.'),{status:400})
  }
  const [deliverySetting,freeThresholdSetting]=await Promise.all([Setting.findOne({key:'deliveryCharge'}).lean(),Setting.findOne({key:'freeShippingThreshold'}).lean()])
  const configuredDelivery=Number(deliverySetting?.value??process.env.DELIVERY_CHARGE_BDT??100)
  const freeShippingThreshold=Number(freeThresholdSetting?.value??3000)
  const deliveryCharge=freeShippingThreshold>0&&subtotal>=freeShippingThreshold?0:configuredDelivery
  const order=await Order.create({
   orderNumber:'SO-'+Date.now()+'-'+randomBytes(3).toString('hex').toUpperCase(),
   customer:req.user.sub,items:lineItems,subtotal,deliveryCharge,discount,total:subtotal-discount+deliveryCharge,couponCode:couponToConsume?.code||'',statusHistory:[{status:'pending',note:'Order placed successfully.'}],
   paymentMethod:'cod',paymentStatus:'unpaid',deliveryAddress:address
  })
  if(couponToConsume)await Coupon.updateOne({_id:couponToConsume._id},{$inc:{usageCount:1}})
  return res.status(201).json({message:'Order placed successfully. Pay cash on delivery.',order})
 }catch(e){
  await Promise.all(reserved.map(x=>Product.updateOne({_id:x.id},{$inc:{stock:x.quantity}}).catch(()=>null)))
  next(e)
 }
})
router.get('/mine',async(req,res,next)=>{try{res.json(await Order.find({customer:req.user.sub}).sort({createdAt:-1}).lean())}catch(e){next(e)}})
router.get('/admin/all',requireRole('super_admin','admin','support'),async(req,res,next)=>{try{res.json(await Order.find().populate('customer','name email phone').sort({createdAt:-1}).limit(200).lean())}catch(e){next(e)}})
router.patch('/:id/status',requireRole('super_admin','admin'),async(req,res,next)=>{try{
 const allowed=['confirmed','processing','shipped','delivered','cancelled','returned']
 if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid order status'})
 const order=await Order.findById(req.params.id)
 if(!order)return res.status(404).json({message:'Order not found'})
 if(order.status==='cancelled'&&req.body.status!=='cancelled')return res.status(409).json({message:'Cancelled orders cannot be reopened; create a new order instead.'})
 if(req.body.status==='cancelled'&&order.status!=='cancelled'){
  const reason=String(req.body.cancellationReason||'').trim()
  if(reason.length<5)return res.status(400).json({message:'Please enter a cancellation reason (at least 5 characters) so the customer can see the notice.'})
  order.cancellationReason=reason.slice(0,500)
  for(const line of order.items)if(line.product)await Product.updateOne({_id:line.product},{$inc:{stock:line.quantity||0}})
 }
 order.status=req.body.status
 order.statusHistory=order.statusHistory||[]
 order.statusHistory.push({status:req.body.status,note:req.body.status==='cancelled'?order.cancellationReason:(req.body.note?String(req.body.note).slice(0,300):'Order status updated.'),createdAt:new Date()})
 if(req.body.status==='delivered'&&order.paymentMethod==='cod')order.paymentStatus='paid'
 await order.save()
 res.json(order)
}catch(e){next(e)}})
export default router
