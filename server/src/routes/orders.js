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
router.post('/coupon/validate',async(req,res,next)=>{try{
 const code=String(req.body.code||'').trim().toUpperCase();const subtotal=Number(req.body.subtotal||0)
 if(!code||!Number.isFinite(subtotal)||subtotal<0)return res.status(400).json({message:'Enter a valid coupon code.'})
 const coupon=await Coupon.findOne({code,isActive:true})
 if(!coupon|| (coupon.expiresAt&&coupon.expiresAt<=new Date()) || (coupon.usageLimit&&coupon.usageCount>=coupon.usageLimit))return res.status(404).json({message:'This coupon is invalid, expired or fully used.'})
 if(subtotal<Number(coupon.minimumOrder||0))return res.status(400).json({message:'Minimum order amount for this coupon is ৳'+Number(coupon.minimumOrder||0)})
 const discount=Math.min(subtotal,coupon.type==='fixed'?Number(coupon.value||0):Math.floor(subtotal*Number(coupon.value||0)/100))
 if(discount<=0)return res.status(400).json({message:'This coupon does not provide a valid discount.'})
 res.json({code:coupon.code,discount,type:coupon.type,value:coupon.value,subtotal,totalAfterDiscount:subtotal-discount})
 }catch(e){next(e)}})
router.post('/',async(req,res,next)=>{
 const reserved=[]
 let couponToConsume=null
 try{
  const address=cleanAddress(req.body.deliveryAddress)
  if(!address.name||!/^01[3-9]\d{8}$/.test(address.phone)||!address.division||!address.district||!address.upazila||address.address.length<8)
   return res.status(400).json({message:'Complete your name, valid Bangladesh phone, division, district, upazila and full address.'})
  const requested=Array.isArray(req.body.items)?req.body.items:[]
  if(!requested.length||requested.length>30)return res.status(400).json({message:'Your cart is empty or contains too many items.'})
  const advancePaymentMethod=String(req.body.advancePaymentMethod||'').toLowerCase();const advancePaymentSender=String(req.body.advancePaymentSender||'').trim();const advancePaymentTransactionId=String(req.body.advancePaymentTransactionId||'').trim();
  const lineItems=[]
  let subtotal=0
  for(const line of requested){
   const id=String(line.productId||'')
   const quantity=Number(line.quantity)
   if(!/^([a-f0-9]{24})$/i.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>20)throw Object.assign(new Error('Invalid cart item or quantity.'),{status:400})
   const size=String(line.size||''),color=String(line.color||'')
   const current=await Product.findOne({_id:id,isPublished:true})
   if(!current)throw Object.assign(new Error('A product is unavailable. Refresh your cart and try again.'),{status:409})
   let product
   const hasVariants=Array.isArray(current.variantStocks)&&current.variantStocks.length>0
   if(hasVariants){
    const variant=current.variantStocks.find(v=>v.size.toLowerCase()===size.toLowerCase()&&v.color.toLowerCase()===color.toLowerCase())
    if(!variant)throw Object.assign(new Error('This size and colour combination is unavailable. Please choose another variant.'),{status:409})
    product=await Product.findOneAndUpdate({_id:id,isPublished:true,variantStocks:{$elemMatch:{size:variant.size,color:variant.color,stock:{$gte:quantity}}}},{ $inc:{'variantStocks.$.stock':-quantity,stock:-quantity} },{new:true})
    if(!product)throw Object.assign(new Error('Insufficient stock for '+size+' / '+color+'. Refresh your cart and try again.'),{status:409})
    reserved.push({id,quantity,size:variant.size,color:variant.color,variant:true})
   }else{
    product=await Product.findOneAndUpdate({_id:id,isPublished:true,stock:{$gte:quantity}},{ $inc:{stock:-quantity} },{new:true})
    if(!product)throw Object.assign(new Error('A product is unavailable or has insufficient stock. Refresh your cart and try again.'),{status:409})
    reserved.push({id,quantity,variant:false})
   }
   const unitPrice=product.price
   subtotal+=unitPrice*quantity
   lineItems.push({product:product._id,name:product.name,sku:product.sku,quantity,unitPrice,size,color})
  }
  let discount=0
  const couponCode=String(req.body.couponCode||'').trim().toUpperCase()
  if(couponCode){
   couponToConsume=await Coupon.findOne({code:couponCode,isActive:true})
   if(!couponToConsume||(couponToConsume.expiresAt&&couponToConsume.expiresAt<=new Date())||(couponToConsume.usageLimit&&couponToConsume.usageCount>=couponToConsume.usageLimit)||subtotal<Number(couponToConsume.minimumOrder||0))throw Object.assign(new Error('Coupon is no longer valid for this order.'),{status:400})
   discount=Math.min(subtotal,couponToConsume.type==='fixed'?Number(couponToConsume.value||0):Math.floor(subtotal*Number(couponToConsume.value||0)/100))
   if(discount<=0)throw Object.assign(new Error('Coupon discount is invalid.'),{status:400})
  }
  const [deliverySetting,freeThresholdSetting,advanceEnabledSetting]=await Promise.all([Setting.findOne({key:'deliveryCharge'}).lean(),Setting.findOne({key:'freeShippingThreshold'}).lean(),Setting.findOne({key:'advancePaymentEnabled'}).lean()])
  const configuredDelivery=Number(deliverySetting?.value??process.env.DELIVERY_CHARGE_BDT??100)
  const freeShippingThreshold=Number(freeThresholdSetting?.value??3000)
  const advancePaymentEnabled=advanceEnabledSetting?.value!==false
  const deliveryCharge=freeShippingThreshold>0&&subtotal>=freeShippingThreshold?0:configuredDelivery
  const advancePaymentAmount=advancePaymentEnabled?deliveryCharge:0
  if(advancePaymentAmount>0&&(!['bkash','nagad'].includes(advancePaymentMethod)||!/^01[3-9]\d{8}$/.test(advancePaymentSender)||advancePaymentTransactionId.length<6||advancePaymentTransactionId.length>80))return res.status(400).json({message:'Enter a valid bKash/Nagad sender mobile number and transaction ID for the delivery charge.'})
  const order=await Order.create({
   orderNumber:'SO-'+Date.now()+'-'+randomBytes(3).toString('hex').toUpperCase(),
   customer:req.user.sub,items:lineItems,subtotal,deliveryCharge,discount,total:subtotal-discount+deliveryCharge,couponCode:couponToConsume?.code||'',statusHistory:[{status:'pending',note:'Order placed successfully.'}],
   paymentMethod:'cod',paymentStatus:advancePaymentAmount>0?'pending':'unpaid',advancePaymentAmount,advancePaymentMethod:advancePaymentAmount>0?advancePaymentMethod:'',advancePaymentSender:advancePaymentAmount>0?advancePaymentSender:'',advancePaymentTransactionId:advancePaymentAmount>0?advancePaymentTransactionId:'',advancePaymentSubmittedAt:advancePaymentAmount>0?new Date():undefined,deliveryAddress:address
  })
  if(couponToConsume&&advancePaymentAmount===0)await Coupon.updateOne({_id:couponToConsume._id},{$inc:{usageCount:1}})
  return res.status(201).json({message:advancePaymentAmount>0?'Order submitted. Delivery charge payment is awaiting manual verification; remaining product amount is Cash on Delivery.':'Order placed. Product amount is Cash on Delivery.',order})
 }catch(e){
  await Promise.all(reserved.map(x=>x.variant?Product.updateOne({_id:x.id,variantStocks:{$elemMatch:{size:x.size,color:x.color}}},{$inc:{stock:x.quantity,'variantStocks.$.stock':x.quantity}}).catch(()=>null):Product.updateOne({_id:x.id},{$inc:{stock:x.quantity}}).catch(()=>null)))
  next(e)
 }
})
router.patch('/:id/advance-payment-verify',requireRole('super_admin','admin'),async(req,res,next)=>{try{
 const decision=String(req.body.decision||'');if(!['approve','reject'].includes(decision))return res.status(400).json({message:'Choose approve or reject.'});
 const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({message:'Order not found.'});
 if(!order.advancePaymentTransactionId||!order.advancePaymentAmount)return res.status(409).json({message:'This order has no advance delivery payment to verify.'});
 if(order.paymentStatus==='paid')return res.status(409).json({message:'Advance payment has already been approved.'});
 if(order.paymentStatus!=='pending')return res.status(409).json({message:'This payment is not awaiting verification.'});
 order.paymentStatus=decision==='approve'?'paid':'failed';order.advancePaymentVerifiedAt=new Date();order.advancePaymentVerifiedBy=req.user.sub;order.advancePaymentNote=String(req.body.note||'').trim().slice(0,300);
 if(decision==='approve'){if(order.couponCode)await Coupon.updateOne({code:order.couponCode},{$inc:{usageCount:1}});order.status='confirmed';order.statusHistory=order.statusHistory||[];order.statusHistory.push({status:'confirmed',note:'Delivery charge advance payment manually verified and approved.',createdAt:new Date()})}
 else {order.status='cancelled';order.cancellationReason='Advance delivery payment was not verified.';order.statusHistory=order.statusHistory||[];order.statusHistory.push({status:'cancelled',note:order.cancellationReason,createdAt:new Date()});for(const line of order.items){const product=await Product.findById(line.product).select('variantStocks').lean();const variant=product?.variantStocks?.find(v=>v.size===line.size&&v.color===line.color);if(variant)await Product.updateOne({_id:line.product,variantStocks:{$elemMatch:{size:line.size,color:line.color}}},{$inc:{stock:line.quantity||0,'variantStocks.$.stock':line.quantity||0}});else await Product.updateOne({_id:line.product},{$inc:{stock:line.quantity||0}})}}
 await order.save();res.json(order);
}catch(e){next(e)}})
router.get('/mine',async(req,res,next)=>{try{res.json(await Order.find({customer:req.user.sub}).sort({createdAt:-1}).lean())}catch(e){next(e)}})
router.get('/admin/all',requireRole('super_admin','admin','support'),async(req,res,next)=>{try{res.json(await Order.find().populate('customer','name email phone').populate('items.product','name sku images').sort({createdAt:-1}).limit(200).lean())}catch(e){next(e)}})
router.patch('/:id/status',requireRole('super_admin','admin','support','editor'),async(req,res,next)=>{try{
 const allowed=['confirmed','processing','shipped','delivered','cancelled','returned']
 if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid order status'})
 const order=await Order.findById(req.params.id)
 if(!order)return res.status(404).json({message:'Order not found'})
 if(order.paymentStatus==='pending'&&req.body.status!=='cancelled')return res.status(409).json({message:'Verify the advance delivery payment before confirming or processing this order.'})
 if(order.status==='cancelled'&&req.body.status!=='cancelled')return res.status(409).json({message:'Cancelled orders cannot be reopened; create a new order instead.'})
 if(req.body.status==='cancelled'&&order.status!=='cancelled'){
  const reason=String(req.body.cancellationReason||'').trim()
  if(reason.length<5)return res.status(400).json({message:'Please enter a cancellation reason (at least 5 characters) so the customer can see the notice.'})
  order.cancellationReason=reason.slice(0,500)
  for(const line of order.items)if(line.product){
   const product=await Product.findById(line.product).select('variantStocks').lean()
   const variant=product?.variantStocks?.find(v=>v.size===line.size&&v.color===line.color)
   if(variant)await Product.updateOne({_id:line.product,variantStocks:{$elemMatch:{size:line.size,color:line.color}}},{$inc:{stock:line.quantity||0,'variantStocks.$.stock':line.quantity||0}})
   else await Product.updateOne({_id:line.product},{$inc:{stock:line.quantity||0}})
  }
 }
 order.status=req.body.status
 order.statusHistory=order.statusHistory||[]
 order.statusHistory.push({status:req.body.status,note:req.body.status==='cancelled'?order.cancellationReason:(req.body.note?String(req.body.note).slice(0,300):'Order status updated.'),createdAt:new Date()})
 if(req.body.status==='delivered'&&order.paymentMethod==='cod')order.paymentStatus='paid'
 await order.save()
 res.json(order)
}catch(e){next(e)}})
export default router
